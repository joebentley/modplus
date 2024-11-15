import * as Tone from 'tone';

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
  let startY = (1 - max / 16) * height;
  let rectHeight = (max - min) / 16 * height;

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
      let currentY = e.clientY - boundRect.top;
      // round CurrentY to the nearest 16th of the height
      currentY = Math.round(currentY / height * 16) / 16 * height;
      rectHeight = Math.abs(currentY - startY);
      // Round rectHeight to the nearest 16th of the height
      rectHeight = Math.round(rectHeight / height * 16) / 16 * height;
      rect.setAttribute('y', Math.min(startY, currentY));
      rect.setAttribute('height', rectHeight);
    }
  };

  svg.addEventListener('pointerdown', (e) => {
    isDragging = true;
    const boundRect = svg.getBoundingClientRect();
    startY = e.clientY - boundRect.top;
    // Round startY to the nearest 16th of the height
    startY = Math.round(startY / height * 16) / 16 * height;
    handlePointerEvent(e);
  }, { passive: false });

  document.addEventListener('pointermove', handlePointerEvent, { passive: false });

  document.addEventListener('pointerup', () => {
    isDragging = false;
    const startY = parseInt(rect.getAttribute('y'));
    let minY = Math.min(startY, startY + rectHeight);
    let maxY = Math.max(startY, startY + rectHeight);

    minY = Math.ceil(minY / height * 16);
    maxY = Math.ceil(maxY / height * 16);

    onChange({ min: 16 - maxY, max: 16 - minY });
  });

  svg.addEventListener('selectstart', (e) => e.preventDefault());
}

document.addEventListener('DOMContentLoaded', () => {
  createMultislider('multislider', sequence, (newSequence) => {
    sequence = newSequence;
  }, { mode: 'line' });

  for (let i = 0; i < 4; i++) {
    createRSlider(`rslider${i}`, 0, 16, ({min, max}) => {
      let offset = min;
      let length = max - min;
      lengths[i] = length;
      offsets[i] = offset;
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
