'use client'

import React, { useRef, useEffect, useState } from 'react';

interface InteractiveFractionCanvasProps {
  denominador: number;
  onChange: (numerador: number) => void;
  initialNumerador?: number;
  disabled?: boolean;
}

const InteractiveFractionCanvas: React.FC<InteractiveFractionCanvasProps> = ({
  denominador,
  onChange,
  initialNumerador = 0,
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numerador, setNumerador] = useState(initialNumerador);

  // Effect to re-draw the canvas when numerator or denominator changes
  useEffect(() => {
    drawCanvas();
  }, [numerador, denominador]);

  // Effect to synchronize internal 'numerador' state with 'initialNumerador' prop
  // This ensures the component resets when a new initialNumerador is passed (e.g., when the parent resets it to 0)
  useEffect(() => {
    setNumerador(initialNumerador);
  }, [initialNumerador]); // Depend on initialNumerador

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return; // Prevent interaction if disabled

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Adjust coordinates for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const adjustedX = x * scaleX;
    const adjustedY = y * scaleY;

    // Calculate layout (must match drawCanvas)
    // Use Math.max(numerador, initialNumerador, 1) to ensure enough bars are drawn for interaction
    const currentMaxBars = Math.max(numerador, initialNumerador, 1);
    const barras = Math.ceil(currentMaxBars / denominador);

    const canvasWidth = canvas.width;
    const spacing = 10;
    // Ensure barWidth calculation is robust for single bar case (barras = 1)
    const barWidth = barras > 0 ? (canvasWidth - spacing * (barras - 1)) / barras : canvasWidth;
    const barHeight = 40;
    const rows = barras > 4 ? 2 : 1;
    const barsPerRow = Math.ceil(barras / rows);

    // Determine row
    let row = 0;
    if (rows === 2) {
      if (adjustedY > 60) { // 20 (initialY) + 40 (barHeight)
        row = 1;
      }
    }

    // Determine column (index of the bar within its row)
    const col = Math.floor(adjustedX / (barWidth + spacing));
    const indexInRow = col; // 'col' directly represents the index in the current row

    // Calculate overall bar index (0-indexed across all rows)
    const barIndex = row * barsPerRow + indexInRow;
    
    // Check if within a valid bar
    if (barIndex >= barras || barIndex < 0) return;

    // Calculate part within the bar
    const barStartX = indexInRow * (barWidth + spacing); // Use indexInRow for accurate startX
    const relativeX = adjustedX - barStartX;
    const partWidth = barWidth / denominador;
    const partIndex = Math.floor(relativeX / partWidth);

    // Check if within a valid part
    if (partIndex >= denominador || partIndex < 0) return;

    // Calculate the clicked part number (1-indexed across all bars)
    const clickedPart = barIndex * denominador + partIndex + 1;
    
    let newNumerador;
    if (clickedPart === numerador) {
      // If the user clicks the exact segment that is currently the numerator,
      // they likely want to "unfill" it. Set to clickedPart - 1.
      newNumerador = clickedPart - 1;
      if (newNumerador < 0) newNumerador = 0; // Ensure it doesn't go negative
    } else if (clickedPart < numerador) {
        // If the user clicks a segment that is already filled, but before the current numerator,
        // they want to "unfill" from the current numerator down to this clicked point.
        newNumerador = clickedPart;
    } else {
        // If the user clicks an unfilled segment, fill up to this point.
        newNumerador = clickedPart;
    }

    setNumerador(newNumerador);
    onChange(newNumerador);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || denominador <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate the number of full bars needed based on the current numerator
    // We want to ensure enough bars are drawn to represent the numerator,
    // even if it exceeds 1 whole (e.g., 5/3 would need 2 bars).
    // Use Math.max(numerador, initialNumerador, 1) to correctly size for incoming initial value or current interaction
    const currentMaxBars = Math.max(numerador, initialNumerador, 1);
    const barras = Math.ceil(currentMaxBars / denominador);

    canvas.width = 350; // Set a fixed internal resolution for drawing
    // Adjust canvas height based on the number of bars
    const rows = barras > 4 ? 2 : 1; // Max 4 bars per row to keep it visually appealing
    canvas.height = rows === 1 ? 100 : 140; // 1 row: 40px bar + 20px top/bottom padding + 20px label space = 80-100. 2 rows: 2*40 bar + 10 spacing + 2*20 padding = 130-140

    const spacing = 10; // Spacing between bars
    // Calculate barWidth considering spacing between multiple bars
    const barWidth = barras > 0 ? (canvas.width - spacing * (barras - 1)) / barras : canvas.width;
    const barHeight = 40;

    const barsPerRow = Math.ceil(barras / rows); // How many bars fit in a row

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing

    for (let i = 0; i < barras; i++) { // Loop through each bar
      const row = Math.floor(i / barsPerRow); // Determine which row this bar belongs to
      const indexInRow = i % barsPerRow; // Determine the position of this bar within its row
      const x = indexInRow * (barWidth + spacing); // X position for the start of this bar
      const y = row === 0 ? 20 : 80; // Y position for the start of this bar (adjust for rows)

      for (let j = 0; j < denominador; j++) { // Loop through each part within the current bar
        const partX = x + j * (barWidth / denominador); // X position for the start of this part
        const isFilled = i * denominador + j < numerador; // Determine if this part should be filled
        
        ctx.fillStyle = isFilled ? '#3B82F6' : '#E5E7EB'; // Blue if filled, light gray if empty
        ctx.fillRect(partX + 1, y + 1, (barWidth / denominador) - 2, barHeight - 2); // Fill rectangle, slightly smaller for border effect

        ctx.strokeStyle = '#374151'; // Dark gray for borders
        ctx.lineWidth = 1;
        ctx.strokeRect(partX, y, (barWidth / denominador), barHeight); // Draw border
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`rounded-lg border ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        // Set fixed dimensions for rendering consistency, then scale with CSS
        width={350}
        height={100} // This will be overridden by drawCanvas for height, but good starting point
        style={{ width: '100%', height: 'auto', maxWidth: '400px' }}
      />
      <div className="text-sm font-semibold text-gray-700">
        Fracción: {numerador}/{denominador}
      </div>
    </div>
  );
};

export default InteractiveFractionCanvas;