import * as Tone from 'tone';

import { createMultislider, createRSlider } from './ui';

// load the samples into ToneAudioBuffers
const buffers = {
  kick: new Tone.ToneAudioBuffer('samples/kick.wav'),
  ch: new Tone.ToneAudioBuffer('samples/ch.wav'),
  oh: new Tone.ToneAudioBuffer('samples/oh.wav'),
  sn: new Tone.ToneAudioBuffer('samples/sn.wav')
};

// generate 16 random integers between 0 and 127
let sequence = Array.from({ length: 16 }, () => {
  // 75% chance of zero
  return Math.random() < 0.75 ? 0 : Math.floor(Math.random() * 68) + 60;
});

let lengths = [sequence.length, 4, 6, 8];
let offsets = [0, 2, 6, 3];
let muted = [false, true, true, true];

const VOICES = sequence.length;
let playerPool;

Tone.loaded().then(() => {
  // Create player pool for polyphony
  playerPool = Array.from({ length: VOICES }, () => {
    const players = [
      new Tone.Player(buffers.kick).toDestination(),
      new Tone.Player(buffers.ch).toDestination(),
      new Tone.Player(buffers.oh).toDestination(),
      new Tone.Player(buffers.sn).toDestination()];
    return { players };
  });

  Tone.getTransport().start();

  let index = 0;
  const mainloop = new Tone.Loop((time) => {
    // Get next available voice
    const voice = playerPool[index % VOICES];
    
    for (let sample_index = 0; sample_index < 4; sample_index++) {
      if (lengths[sample_index] > 0) {
        // Calculate index based on lengths and offsets
        const sequence_index = index % lengths[sample_index] + offsets[sample_index];
        // Cap sequence index to sequence length and get velocity
        const velocity = sequence[sequence_index % sequence.length] / 127;

        voice.players[sample_index].volume.linearRampToValueAtTime(Tone.gainToDb(velocity), time);

        // Play the note
        if (!muted[sample_index])
          voice.players[sample_index].start(time);
      }
    }
    
    // Move to next voice and step
    index++;
  }, '16n').start(0);
});

document.addEventListener('DOMContentLoaded', () => {
  createMultislider('multislider', [...sequence], (newSequence) => {
    sequence = newSequence;
  }, { mode: 'line' });

  for (let i = 0; i < 4; i++) {
    createRSlider(`rslider${i}`, offsets[i], offsets[i] + lengths[i], ({min, max}) => {
      let offset = min;
      let length = max - min;
      lengths[i] = length;
      offsets[i] = offset;

      // Prevent offsets from being negative due to mouse dragging outside the slider
      if (offsets[i] < 0) {
        offsets[i] = 0;
      }

      // Prevent lengths from exceeding the sequence length
      if (offsets[i] + lengths[i] > sequence.length) {
        lengths[i] = sequence.length - offsets[i];
      }
    });

    const muteButton = document.getElementById(`mute${i}`);
    muteButton.classList.toggle('muted', muted[i]);
    muteButton.addEventListener('click', () => {
      const isMuted = muteButton.classList.toggle('muted');
      muted[i] = isMuted;
    });
  }

  document.querySelector('#start')?.addEventListener('click', async () => {
    await Tone.start();
  });
});
