import * as Tone from 'tone';

const player1 = new Tone.Player('samples/kick.wav').toDestination();
const player2 = new Tone.Player('samples/ch.wav').toDestination();
const player3 = new Tone.Player('samples/oh.wav').toDestination();
const player4 = new Tone.Player('samples/sn.wav').toDestination();

// generate 16 random integers between 0 and 127
let sequence = Array.from({ length: 16 }, () => {
  // 30% chance of zero
  return Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 127) + 1;
});

let lengths = [sequence.length, 4, 6, 8];
let offsets = [0, 2, 6, 3];
let muted = [false, true, true, true];

// Create player pool for polyphony
const VOICES = sequence.length;
const playerPool = Array.from({ length: VOICES }, () => {
  const players = [
    new Tone.Player('samples/kick.wav').toDestination(),
    new Tone.Player('samples/ch.wav').toDestination(),
    new Tone.Player('samples/oh.wav').toDestination(),
    new Tone.Player('samples/sn.wav').toDestination()];
  return { players };
});

Tone.loaded().then(() => {
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


function createMultislider(container, sequence, onChange, options = { mode: 'bar' }) {
  const svg = document.getElementById(container);
  const width = parseInt(svg.getAttribute('width'));
  const height = parseInt(svg.getAttribute('height'));
  const sliderWidth = width / sequence.length;
  const lineThickness = 2;
  
  svg.innerHTML = '';
  let isDragging = false;
  
  // Create sliders
  const sliders = sequence.map((value, index) => {
    const slider = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    updateSlider(slider, value, index);
    svg.appendChild(slider);
    return slider;
  });
  
  function updateSlider(slider, value, index) {
    const x = index * sliderWidth;
    const sliderHeight = (value / 127) * height;
    
    if (options.mode === 'line') {
      slider.setAttribute('x', x);
      slider.setAttribute('y', height - sliderHeight - lineThickness/2);
      slider.setAttribute('width', sliderWidth - 1);
      slider.setAttribute('height', lineThickness);
    } else {
      slider.setAttribute('x', x);
      slider.setAttribute('y', height - sliderHeight);
      slider.setAttribute('width', sliderWidth - 1);
      slider.setAttribute('height', sliderHeight);
    }
    slider.setAttribute('fill', '#000');
  }
  
  function handlePointerEvent(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    const svgRect = svg.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    const sliderIndex = Math.floor(x / sliderWidth);
    if (sliderIndex >= 0 && sliderIndex < sequence.length) {
      const normalizedY = Math.max(0, Math.min(1, (height - y) / height));
      const newValue = Math.floor(normalizedY * 127);
      
      sequence[sliderIndex] = newValue;
      updateSlider(sliders[sliderIndex], newValue, sliderIndex);
      
      if (onChange) onChange(sequence);
    }
  }
  
  // Event listeners
  svg.addEventListener('pointerdown', (e) => {
    isDragging = true;
    handlePointerEvent(e);
  }, { passive: false });
  
  document.addEventListener('pointermove', handlePointerEvent, { passive: false });
  
  document.addEventListener('pointerup', () => {
    isDragging = false;
  });
  
  // Prevent text selection while dragging
  svg.addEventListener('selectstart', (e) => e.preventDefault());
  
  return {
    update: (newSequence) => {
      newSequence.forEach((value, index) => {
        updateSlider(sliders[index], value, index);
      });
    }
  };
}

function createRSlider(container, min, max, onChange) {
  const svg = document.getElementById(container);
  const sliderWidth = parseInt(svg.getAttribute('width'));
  const height = parseInt(svg.getAttribute('height'));
  
  svg.innerHTML = '';
  let isDragging = false;
  let startY = (1 - max) * height;
  let rectHeight = (max - min) * height;

  // Create slider rect
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', 0);
  rect.setAttribute('y', startY);
  rect.setAttribute('width', sliderWidth);
  rect.setAttribute('height', rectHeight);
  rect.setAttribute('fill', '#000');
  svg.appendChild(rect);

  const handlePointerEvent = (e) => {
    if (isDragging) {
      const boundRect = svg.getBoundingClientRect();
      const currentY = e.clientY - boundRect.top;
      rectHeight = Math.abs(currentY - startY);
      rect.setAttribute('y', Math.min(startY, currentY));
      rect.setAttribute('height', rectHeight);
    }
  };

  svg.addEventListener('pointerdown', (e) => {
    isDragging = true;
    const boundRect = svg.getBoundingClientRect();
    startY = e.clientY - boundRect.top;
    handlePointerEvent(e);
  }, { passive: false });

  document.addEventListener('pointermove', handlePointerEvent, { passive: false });

  document.addEventListener('pointerup', () => {
    isDragging = false;
    const minY = Math.min(startY, startY + rectHeight);
    const maxY = Math.max(startY, startY + rectHeight);
    onChange({ min: minY / height, max: maxY / height });
  });

  svg.addEventListener('selectstart', (e) => e.preventDefault());
}

document.addEventListener('DOMContentLoaded', () => {
  createMultislider('multislider', sequence, (newSequence) => {
    console.log('Sequence updated:', newSequence);
  }, { mode: 'line' });

  for (let i = 0; i < 4; i++) {
    createRSlider(`rslider${i}`, 0, 1, ({min, max}) => {
      console.log(`Slider ${i} updated:`, { min, max });
      let offset = min * 16;
      let length = (max - min) * 16;
      lengths[i] = Math.round(length);
      offsets[i] = Math.round(offset);
    });

    const muteButton = document.getElementById(`mute${i}`);
    muteButton.classList.toggle('muted', muted[i]);
    muteButton.addEventListener('click', () => {
      const isMuted = muteButton.classList.toggle('muted');
      console.log(`Sound ${i} ${isMuted ? 'muted' : 'unmuted'}`);
      muted[i] = isMuted;
    });
  }

  document.querySelector('#start')?.addEventListener('click', async () => {
    await Tone.start();
  });
});
