
import * as Tonal from "tonal";

export class LoFiAudioEngine {
    private ctx: AudioContext | null = null;
    private isPlaying: boolean = false;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    
    private nextNoteTime: number = 0;
    private beatCount: number = 0;
    private tempo: number = 80; // Lo-Fi Tempo
    private lookahead: number = 25.0; // ms
    private scheduleAheadTime: number = 0.1; // s
    private timerID: number | null = null;
    private analyser: AnalyserNode | null = null;
    
    // FX
    private crackleNode: AudioBufferSourceNode | null = null;
    private crackleGain: GainNode | null = null;

    private currentChord: string[] = [];
    private chordQueue: string[][] = [];

    constructor() {}

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Master Bus
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Default volume
            
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -12;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 128; // Higher res for visualizer
            this.analyser.smoothingTimeConstant = 0.8;

            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
        }
    }

    public getAnalyserNode(): AnalyserNode | null {
        return this.analyser;
    }

    public getEnergy(): number {
        if (!this.analyser) return 0;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        return sum / bufferLength / 255; // Normalized 0-1
    }

    public start() {
        this.init();
        if (this.isPlaying || !this.ctx) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.startCrackle();
        
        this.timerID = window.setInterval(() => this.scheduler(), this.lookahead);
    }

    public stop() {
        this.isPlaying = false;
        if (this.timerID) {
            window.clearInterval(this.timerID);
            this.timerID = null;
        }
        this.stopCrackle();
        
        // Fade out
        if (this.ctx && this.masterGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setTargetAtTime(0, now, 0.5);
        }
    }

    public setMute(mute: boolean) {
        if (!this.masterGain || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.3, now, 0.2);
    }

    // --- Ambience ---

    private startCrackle() {
        if (!this.ctx || !this.masterGain) return;
        
        // Create Pink Noise buffer for vinyl crackle
        const bufferSize = 2 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
        }

        this.crackleNode = this.ctx.createBufferSource();
        this.crackleNode.buffer = buffer;
        this.crackleNode.loop = true;
        
        this.crackleGain = this.ctx.createGain();
        this.crackleGain.gain.value = 0.02; // Very quiet

        // Highpass to remove rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        this.crackleNode.connect(filter);
        filter.connect(this.crackleGain);
        this.crackleGain.connect(this.masterGain);
        
        this.crackleNode.start();
    }

    private stopCrackle() {
        if (this.crackleNode) {
            this.crackleNode.stop();
            this.crackleNode = null;
        }
    }

    // --- Theory ---

    private getNextChord(): string[] {
        // C Minor / Eb Major Lofi Progression
        // ii - V - I - VI etc
        const keys = ["Cm", "Eb"];
        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        
        // Manual fallback progressions just in case Tonal has issues in browser env
        const progressions = [
            ["Fm9", "Bb13", "Ebmaj9", "C7alt"],
            ["Abmaj7", "Gm7", "Fm7", "Bb7"],
            ["Cm9", "Fm9", "Dm7b5", "G7alt"],
            ["Abmaj9", "Dbmaj9", "Gm7", "C7b9"]
        ];

        if (this.chordQueue.length === 0) {
            const prog = progressions[Math.floor(Math.random() * progressions.length)];
            // Duplicate each chord for 1 bar duration
            this.chordQueue = prog.map(c => [c]); 
        }

        const next = this.chordQueue.shift();
        if (!next) return ["Cm9"];

        try {
            // @ts-ignore
            const notes = Tonal.Chord.get(next[0]).notes;
            // @ts-ignore
            if (notes.length > 0) return notes.map(n => n + "4"); // 4th Octave default
        } catch (e) {}

        return ["C4", "Eb4", "G4", "Bb4"]; // Fallback Cm7
    }

    // --- Scheduler ---

    private scheduler() {
        if (!this.ctx) return;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleBeat(this.nextNoteTime, this.beatCount);
            const secondsPerBeat = 60.0 / this.tempo;
            // 16th notes
            this.nextNoteTime += 0.25 * secondsPerBeat; 
            this.beatCount++;
        }
    }

    private scheduleBeat(time: number, beat: number) {
        const sixteenth = beat % 16; // 1 Bar loop of 16th notes
        
        // Swing logic: delay every even 16th note slightly
        const swing = sixteenth % 2 === 0 ? 0 : 0.03; 
        const playTime = time + swing;

        // --- Drums ---
        // Kick: 1, 11 (ghost), 3 (sometimes)
        if (sixteenth === 0) this.playKick(playTime, 0.8);
        if (sixteenth === 10) this.playKick(playTime, 0.4); 
        
        // Snare: 4, 12 (Backbeat)
        if (sixteenth === 4 || sixteenth === 12) this.playSnare(playTime);

        // HiHat: Every 8th note (0, 2, 4...)
        if (sixteenth % 2 === 0) {
            this.playHiHat(playTime, sixteenth % 4 === 0 ? 0.3 : 0.15);
        }

        // --- Keys / Chords ---
        // Change chord every bar (beat 0)
        if (sixteenth === 0) {
            this.currentChord = this.getNextChord();
            this.playRhodesChord(playTime, this.currentChord);
        }
        
        // Occasional melody note
        if (Math.random() > 0.8 && sixteenth % 2 === 0) {
             const note = this.currentChord[Math.floor(Math.random() * this.currentChord.length)];
             if (note) this.playMelodyNote(playTime, note);
        }
    }

    // --- Instruments ---

    private playKick(time: number, vol: number) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(time);
        osc.stop(time + 0.5);
    }

    private playSnare(time: number) {
        if (!this.ctx || !this.masterGain) return;
        
        // Tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, time);
        oscGain.gain.setValueAtTime(0.2, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 0.1);

        // Noise
        const bufferSize = this.ctx.sampleRate * 0.1; // 0.1s
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(time);
    }

    private playHiHat(time: number, vol: number) {
        if (!this.ctx || !this.masterGain) return;
        // White noise buffer logic could be cached, but creating small buffers is cheap enough here
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) data[i] = (Math.random() * 2 - 1);

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol * 0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(time);
    }

    private playRhodesChord(time: number, notes: string[]) {
        notes.forEach((note, i) => {
             // Stagger notes for strum effect
             this.playRhodesNote(time + (i * 0.03), note);
        });
    }

    private playRhodesNote(time: number, note: string) {
        if (!this.ctx || !this.masterGain) return;
        
        let freq = 440;
        try { 
            // @ts-ignore
            freq = Tonal.Note.freq(note) || 440; 
        } catch(e) {}

        // FM Synthesis: Carrier + Modulator
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        // Frequencies
        carrier.frequency.value = freq;
        carrier.type = 'sine';
        modulator.frequency.value = freq * 2; // Ratio 1:2
        modulator.type = 'sine';

        // Tape Wobble (LFO on carrier detune)
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = Math.random() * 3; // Slow wobble
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 15; // Detune amount
        lfo.connect(lfoGain);
        lfoGain.connect(carrier.detune);
        lfo.start(time);
        lfo.stop(time + 2);

        // FM Connection
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(mainGain);
        mainGain.connect(this.masterGain);

        // Envelopes
        // Modulator Envelope (Brightness)
        modGain.gain.setValueAtTime(freq * 0.5, time);
        modGain.gain.exponentialRampToValueAtTime(1, time + 0.2);

        // Carrier Envelope (Volume)
        mainGain.gain.setValueAtTime(0, time);
        mainGain.gain.linearRampToValueAtTime(0.1, time + 0.02);
        mainGain.gain.exponentialRampToValueAtTime(0.001, time + 2.5); // Long tail

        carrier.start(time);
        modulator.start(time);
        carrier.stop(time + 3);
        modulator.stop(time + 3);
    }

    private playMelodyNote(time: number, note: string) {
         if (!this.ctx || !this.masterGain) return;
         // Octave up for melody
         let freq = 440;
         try {
             // @ts-ignore
             const n = Tonal.Note.simplify(note);
             // @ts-ignore
             freq = Tonal.Note.freq(n) * 2; // Shift up
         } catch(e) {}

         const osc = this.ctx.createOscillator();
         const gain = this.ctx.createGain();
         osc.type = 'sine';
         osc.frequency.value = freq;
         
         gain.gain.setValueAtTime(0, time);
         gain.gain.linearRampToValueAtTime(0.05, time + 0.05);
         gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

         osc.connect(gain);
         gain.connect(this.masterGain);
         osc.start(time);
         osc.stop(time + 0.5);
    }
}
