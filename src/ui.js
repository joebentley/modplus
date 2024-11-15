export function createMultislider(container, sequence, onChange, options = { mode: 'bar' }) {
  const svg = document.getElementById(container);
  const width = parseInt(svg.getAttribute('width'));
  const height = parseInt(svg.getAttribute('height'));

  const realWidth = svg.getBoundingClientRect().width;
  const sliderWidth = realWidth / sequence.length;

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
      slider.setAttribute('width', sliderWidth);
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

export function createRSlider(container, min, max, onChange) {
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
    // Get actual top of rectangle, since startY can be the bottom
    const currentY = parseInt(rect.getAttribute('y'));
    let minY = Math.min(currentY, currentY + rectHeight);
    let maxY = Math.max(currentY, currentY + rectHeight);

    minY = Math.ceil(minY / height * 16);
    maxY = Math.ceil(maxY / height * 16);

    // if minY == maxY, set to full range
    if (minY === maxY) {
      maxY = 16;
      minY = 0;
      rect.setAttribute('y', 0);
      rect.setAttribute('height', height);
    }

    let min = 16 - maxY;
    let max = 16 - minY;

    // hack to make sure size is correct
    startY = (1 - max / 16) * height;
    rectHeight = (max - min) / 16 * height;
    rect.setAttribute('y', startY);
    rect.setAttribute('height', rectHeight);

    onChange({ min, max });
  });

  svg.addEventListener('selectstart', (e) => e.preventDefault());

  return { update: (min, max) => {
    console.log(min, max);
    startY = (1 - max / 16) * height;
    rectHeight = (max - min) / 16 * height;
    rect.setAttribute('y', startY);
    rect.setAttribute('height', rectHeight);
  }};
}

export function createIndexCounter(container, numSteps) {
  const svg = document.getElementById(container);
  // TODO: check for responsive width for smaller screens
  const width = parseInt(svg.getAttribute('width'));
  const height = parseInt(svg.getAttribute('height'));
  svg.innerHTML = '';

  Array.from({ length: numSteps }).forEach((_, index) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', index * width / numSteps);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', width / numSteps - 2);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', '#888');
    svg.appendChild(rect);
  });

  return (index, velocity) => {
      const rects = svg.children;
      Array.from(rects).forEach((rect, i) => {
        let fillCol = velocity > 0.0 ? '#fff' : '#000';

        rect.setAttribute('fill', i === index ? fillCol : '#888');
      });
  };
}

export function createPresetManager(container, numPresets, presetsPerRow, onSelected, onSaved) {
  const svg = document.getElementById(container);
  const width = parseInt(svg.getAttribute('width'));
  const height = parseInt(svg.getAttribute('height'));
  svg.innerHTML = '';

  const margin = 4;
  const buttonsWidth = width - margin;
  const buttonsHeight = height - margin;

  let hoveredPreset = -1;
  let selectedPreset = -1;
  let isShiftKeyDown = false;
  let saved = [];

  const presets = Array.from({ length: numPresets }).map((_, index) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (index % presetsPerRow) * buttonsWidth / presetsPerRow + margin);
    rect.setAttribute('y', Math.floor(index / presetsPerRow) * buttonsHeight / Math.ceil(numPresets / presetsPerRow) + margin);
    rect.setAttribute('width', buttonsWidth / presetsPerRow - margin);
    rect.setAttribute('height', buttonsHeight / Math.ceil(numPresets / presetsPerRow) - margin);
    rect.setAttribute('fill', '#888');
    rect.setAttribute('stroke', 'none');
    rect.setAttribute('stroke-width', '1');
    svg.appendChild(rect);

    rect.addEventListener('mouseenter', (e) => {
      hoveredPreset = index;
      if (selectedPreset !== index) {
        if (saved.includes(index) || isShiftKeyDown) {
          rect.setAttribute('fill', '#000');
        } else {
          rect.setAttribute('fill', '#888');
        }
      }

      rect.setAttribute('stroke', '#000');
    });

    rect.addEventListener('mouseleave', () => {
      hoveredPreset = -1;
      rect.setAttribute('stroke', 'none');
      if (!saved.includes(index))
        rect.setAttribute('fill', '#888');
    });

    rect.addEventListener('click', () => {
      if (!isShiftKeyDown && saved.includes(index)) {
        selectedPreset = index;

        for (let i = 0; i < numPresets; i++) {
          if (presets[i].getAttribute('fill') === '#FFA500')
            presets[i].setAttribute('fill', '#000');
        }
        rect.setAttribute('fill', '#FFA500');
        if (onSelected) onSelected(index);
      }

      if (isShiftKeyDown) {
        if (!saved.includes(index)) {
          saved.push(index);
          rect.setAttribute('fill', '#000');
        }

        if (onSaved) onSaved(index);
      }
    });

    return rect;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      isShiftKeyDown = true;
      if (selectedPreset !== hoveredPreset && hoveredPreset !== -1) {
        presets[hoveredPreset].setAttribute('fill', '#000');
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      isShiftKeyDown = false;
      if (!saved.includes(hoveredPreset) && hoveredPreset !== -1) {
        presets[hoveredPreset].setAttribute('fill', '#888');
      }
    }
  });

  return {
    getHoveredPreset: () => hoveredPreset,
    isShiftKeyDown: () => isShiftKeyDown
  };
}