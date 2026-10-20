// audio-controller.js

export class SoundController {
    constructor() {
        this.audioCtx = null;
        this.isMuted = false;
        this.theme = 'chiptune';
        this.customAudio = {
            correct: null,
            wrong: null,
            bgm: null
        };
        this.bgmAudioElement = null;
        this.bgmVolume = 0.4;
    }

    initContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setTheme(themeName) {
        this.theme = themeName;
    }

    setCustomAudio(type, dataUrl) {
        this.customAudio[type] = dataUrl;
        if (type === 'bgm') {
            this.updateBgmSource(dataUrl);
        }
    }

    clearCustomAudio(type) {
        this.customAudio[type] = null;
        if (type === 'bgm' && this.bgmAudioElement) {
            this.bgmAudioElement.pause();
            this.bgmAudioElement = null;
        }
    }

    setBgmVolume(volume) {
        this.bgmVolume = parseFloat(volume);
        if (this.bgmAudioElement) {
            this.bgmAudioElement.volume = this.bgmVolume;
        }
    }

    updateBgmSource(dataUrl) {
        if (this.bgmAudioElement) {
            this.bgmAudioElement.pause();
        }
        if (dataUrl) {
            this.bgmAudioElement = new Audio(dataUrl);
            this.bgmAudioElement.loop = true;
            this.bgmAudioElement.volume = this.bgmVolume;
        } else {
            this.bgmAudioElement = null;
        }
    }

    toggleBgmPreview() {
        if (!this.customAudio.bgm && !this.bgmAudioElement) {
            alert('請先上傳背景音樂檔案！');
            return;
        }
        if (!this.bgmAudioElement) {
            this.updateBgmSource(this.customAudio.bgm);
        }
        if (this.bgmAudioElement.paused) {
            this.bgmAudioElement.play().catch(e => console.error("BGM Play Error:", e));
        } else {
            this.bgmAudioElement.pause();
        }
    }

    playCorrectSound() {
        if (this.isMuted) return;
        if (this.customAudio.correct) {
            this.playCustomAudio(this.customAudio.correct);
            return;
        }
        this.initContext();
        this.synthCorrectSound();
    }

    playWrongSound() {
        if (this.isMuted) return;
        if (this.customAudio.wrong) {
            this.playCustomAudio(this.customAudio.wrong);
            return;
        }
        this.initContext();
        this.synthWrongSound();
    }

    synthCorrectSound() {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        if (this.theme === 'chiptune') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.08);
        } else if (this.theme === 'marimba') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15);
        } else if (this.theme === 'pop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        }

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    synthWrongSound() {
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        if (this.theme === 'chiptune') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.setValueAtTime(100, now + 0.1);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        }

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playCustomAudio(dataUrl) {
        const audio = new Audio(dataUrl);
        audio.volume = 0.7;
        audio.play().catch(e => console.error("Audio Play Error:", e));
    }
}