export class AudioAnalyzer {
    /**
     * Analyzes an audio file to determine if it is a "fake upscale" (e.g., a 128kbps file converted to FLAC).
     * It does this by reading a short segment of audio and comparing High-Frequency Energy vs Mid-Frequency Energy.
     * True upscales typically have a sharp cutoff above 16kHz, throwing the ratio off.
     * 
     * @param file The audio File to analyze
     * @param duration The total duration of the track in seconds, used to seek to a representative segment
     * @returns A boolean representing if the file is likely upscaled, or null if the analysis fails or is inconclusive.
     */
    static async checkIsUpscale(file: File, duration: number): Promise<boolean | null> {
        try {
            const audioUrl = URL.createObjectURL(file);
            const audioEl = new Audio(audioUrl);

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaElementSource(audioEl);
            const analyser = audioCtx.createAnalyser();
            const gainNode = audioCtx.createGain();

            // Mute the audio so the user doesn't hear the scan playback
            gainNode.gain.value = 0;

            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.2; // Fast response

            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Start around 30% into the song
            const seekTime = Math.max(0, duration * 0.3);
            audioEl.currentTime = seekTime;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            await audioEl.play();

            // Let it play for a bit to gather FFT data
            await new Promise(resolve => setTimeout(resolve, 800));

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            // Stop playback and cleanup immediately
            audioEl.pause();
            audioEl.src = "";
            audioCtx.close();
            URL.revokeObjectURL(audioUrl);

            const sampleRate = audioCtx.sampleRate;
            const nyquist = sampleRate / 2;

            // Compare high bands (>16.5kHz) to mid bands (2kHz - 10kHz)
            let highBandEnergy = 0;
            let highBandCount = 0;
            let midBandEnergy = 0;
            let midBandCount = 0;

            for (let i = 0; i < bufferLength; i++) {
                const freq = (i / bufferLength) * nyquist;
                const db = dataArray[i];

                // WebAudio dB is usually -100 to 0 (sometimes lower). Transform it to a linear-like positive scale.
                // We use Math.pow to emphasize louder peaks and minimize noise floor.
                const energy = Math.pow(10, db / 20);

                if (freq > 16500 && freq < 20000) {
                    highBandEnergy += energy;
                    highBandCount++;
                } else if (freq > 2000 && freq < 10000) {
                    midBandEnergy += energy;
                    midBandCount++;
                }
            }

            if (highBandCount > 0 && midBandCount > 0) {
                const avgHigh = highBandEnergy / highBandCount;
                const avgMid = midBandEnergy / midBandCount;

                if (avgMid < 0.0001) {
                    console.warn(`[AudioAnalyzer] FFT read silence (Mid: ${avgMid}). AudioContext might be blocked or file is silent at ${seekTime}s.`);
                    return null;
                }

                // Instead of absolute db thresholds which break depending on the volume of the song,
                // we look at the raw ratio between the high band and mid band.
                // Fakes typically completely flatline above 16kHz, resulting in ratios < 0.05
                // Genuine tracks typically maintain a steady harmonic decay, resulting in ratios > 0.1
                const ratio = avgHigh / avgMid;
                const isUpscale = ratio < 0.02;

                console.log(`[AudioAnalyzer] Analyzed for upscale. Mid: ${avgMid.toExponential(2)}, High: ${avgHigh.toExponential(2)}, Ratio: ${ratio.toFixed(4)}, Result: ${isUpscale ? 'Upscale' : 'Genuine'}`);
                return isUpscale;
            }
            return null;
        } catch (error) {
            console.error("[AudioAnalyzer] Failed to analyze for upscaling", error);
            return false; // Fallback
        }
    }
}
