import * as Tone from 'tone';

import { createIndexCounter, createMultislider, createPresetManager, createRSlider } from './ui';

// load the samples into ToneAudioBuffers
let sampleNames = ['kick.wav',
'ch.wav',
'oh.wav',
'sn.wav',
'C21PIPE1.wav',
'I06SOLID_K.wav',
'I37CLSD_H1.wav',
'I38OPEN_H1.wav',
'I48CLAVE1.wav',
'I61CAN1.wav'];

// Construct buffers
const buffers = {};
sampleNames.forEach((sample) => {
  const sampleNameWithoutExtension = sample.replace('.wav', '');
  buffers[sampleNameWithoutExtension] = new Tone.ToneAudioBuffer(`samples/${sample}`);
});

// generate 16 random integers between 0 and 127
let sequence = Array.from({ length: 16 }, () => {
  // 75% chance of zero
  return Math.random() < 0.75 ? 0 : Math.floor(Math.random() * 68) + 60;
});

let lengths = [sequence.length, 4, 6, 8];
let offsets = [0, 2, 6, 3];
let muted = [false, true, true, true];
let indexCounterUpdateFunctions = [];

let presets = {};

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
        let velocity = sequence[sequence_index % sequence.length] / 127;

        // Apply velocity curve
        velocity = Math.pow(velocity, 1.8);

        voice.players[sample_index].volume.linearRampToValueAtTime(Tone.gainToDb(velocity), time);

        if (!muted[sample_index])
          indexCounterUpdateFunctions[sample_index](sequence_index, velocity);

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
  // Initial samples in order
  const initialSamples = ['kick.wav', 'ch.wav', 'oh.wav', 'sn.wav'];
  
  // Add select population
  for (let i = 0; i < 4; i++) {
    const select = document.getElementById(`dropdown${i}`);
    sampleNames.forEach(sample => {
      const option = document.createElement('option');
      option.value = sample;
      option.text = sample.replace('.wav', '');
      if (sample === initialSamples[i]) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Add change event listener
    select.addEventListener('change', (e) => {
      const newSampleName = e.target.value;
      const trackIndex = i;
      const sampleNameWithoutExtension = newSampleName.replace('.wav', '');
      
      // Update all voices in the pool for this track
      playerPool.forEach(voice => {
        voice.players[trackIndex].dispose(); // Clean up old player
        voice.players[trackIndex] = new Tone.Player(buffers[sampleNameWithoutExtension]).toDestination();
      });
    });
  }

  const multislider = createMultislider('multislider', [...sequence], (newSequence) => {
    sequence = newSequence;
  }, { mode: 'line' });

  let rsliders = [];
  for (let i = 0; i < 4; i++) {
    rsliders.push(createRSlider(`rslider${i}`, offsets[i], offsets[i] + lengths[i], ({min, max}) => {
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
    }));

    const muteButton = document.getElementById(`mute${i}`);
    muteButton.classList.toggle('muted', muted[i]);
    muteButton.addEventListener('click', () => {
      const isMuted = muteButton.classList.toggle('muted');
      muted[i] = isMuted;
    });

    indexCounterUpdateFunctions[i] = createIndexCounter(`indexCounter${i}`, 16);
  }

  createPresetManager('presetManager', 64, 8, (preset) => {
    const currentPreset = presets[preset];
    sequence = [...currentPreset.sequence];
    offsets = [...currentPreset.offsets];
    lengths = [...currentPreset.lengths];
    muted = [...currentPreset.muted];
    multislider.update(sequence);
    for (let i = 0; i < 4; i++) {
      rsliders[i].update(offsets[i], offsets[i] + lengths[i]);
      const muteButton = document.getElementById(`mute${i}`);
      muteButton.classList.toggle('muted', muted[i]);
    };
  }, (preset) => {
    presets[preset] = {
      sequence: [...sequence],
      offsets: [...offsets],
      lengths: [...lengths],
      muted: [...muted]
    };
  });

  document.querySelector('#start')?.addEventListener('click', async () => {
    await Tone.start();
  });
});
