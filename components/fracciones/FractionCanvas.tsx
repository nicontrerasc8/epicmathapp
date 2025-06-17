// components/FractionCanvas.tsx
import React, { useRef, useEffect } from 'react';

interface FractionCanvasProps {
  numerador: number;
  denominador: number;
}

const FractionCanvas: React.FC<FractionCanvasProps> = ({
  numerador,
  denominador,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar el canvas antes de dibujar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Validación para evitar división por cero o valores inválidos
    if (denominador <= 0 || numerador < 0) return;

    // --- Parámetros de dibujo optimizados ---
    const padding = 15;
    const availableWidth = canvas.width - (padding * 2);
    const availableHeight = canvas.height - (padding * 2);

    // Calcular partes enteras y el resto
    const wholeParts = Math.floor(numerador / denominador);
    const remainder = numerador % denominador;

    // Determinar el número de barras necesarias
    let numberOfBars = wholeParts;
    if (remainder > 0 || (numerador === 0 && denominador > 0)) {
      numberOfBars += 1;
    }

    // Si no hay barras que dibujar, salir
    if (numberOfBars === 0) return;

    // Calcular layout óptimo según el número de barras
    let barsPerRow, numberOfRows, barWidth, barHeight;

    if (numberOfBars <= 3) {
      // Para pocas barras, usar una sola fila
      barsPerRow = numberOfBars;
      numberOfRows = 1;
      barWidth = Math.min(120, (availableWidth - (barsPerRow - 1) * 10) / barsPerRow);
      barHeight = Math.min(60, availableHeight - 20);
    } else if (numberOfBars <= 12) {
      // Para cantidades medianas, usar máximo 4 barras por fila
      barsPerRow = Math.min(4, Math.ceil(Math.sqrt(numberOfBars)));
      numberOfRows = Math.ceil(numberOfBars / barsPerRow);
      barWidth = Math.min(80, (availableWidth - (barsPerRow - 1) * 8) / barsPerRow);
      barHeight = Math.min(40, (availableHeight - (numberOfRows - 1) * 8) / numberOfRows);
    } else {
      // Para muchas barras, optimizar el espacio
      barsPerRow = Math.min(6, Math.floor(availableWidth / 50));
      numberOfRows = Math.ceil(numberOfBars / barsPerRow);
      barWidth = Math.max(40, (availableWidth - (barsPerRow - 1) * 5) / barsPerRow);
      barHeight = Math.max(20, Math.min(35, (availableHeight - (numberOfRows - 1) * 5) / numberOfRows));
    }

    const spacingX = barsPerRow > 1 ? (availableWidth - barsPerRow * barWidth) / (barsPerRow - 1) : 0;
    const spacingY = numberOfRows > 1 ? (availableHeight - numberOfRows * barHeight) / (numberOfRows - 1) : 0;

    // --- Función auxiliar para dibujar una barra de fracción ---
    const drawSingleFractionBar = (
      ctx: CanvasRenderingContext2D,
      n: number,
      d: number,
      x: number,
      y: number,
      width: number,
      height: number,
      fillColor: string
    ) => {
      // Dibujar el contorno completo de la barra
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Dibujar las partes llenas
      const filledWidth = (n / d) * width;
      ctx.fillStyle = fillColor;
      ctx.fillRect(x + 1, y + 1, filledWidth - 2, height - 2);

      // Dibujar las divisiones internas (solo si es visualmente útil)
      if (d <= 10 && width > 60) {
        ctx.strokeStyle = '#6B7280';
        ctx.lineWidth = 1;
        for (let i = 1; i < d; i++) {
          const divX = x + (i / d) * width;
          ctx.beginPath();
          ctx.moveTo(divX, y + 1);
          ctx.lineTo(divX, y + height - 1);
          ctx.stroke();
        }
      } else if (d > 10 && width > 80) {
        // Para denominadores grandes, solo marcar algunas divisiones clave
        const step = Math.ceil(d / 5); // Máximo 5 divisiones visibles
        ctx.strokeStyle = '#9CA3AF';
        ctx.lineWidth = 0.5;
        for (let i = step; i < d; i += step) {
          const divX = x + (i / d) * width;
          ctx.beginPath();
          ctx.moveTo(divX, y + 1);
          ctx.lineTo(divX, y + height - 1);
          ctx.stroke();
        }
      }
    };

    // --- Dibujar las barras ---
    let barIndex = 0;

    // Centrar el contenido
    const totalContentWidth = barsPerRow * barWidth + (barsPerRow - 1) * spacingX;
    const totalContentHeight = numberOfRows * barHeight + (numberOfRows - 1) * spacingY;
    const startX = padding + (availableWidth - totalContentWidth) / 2;
    const startY = padding + (availableHeight - totalContentHeight) / 2;

    // Dibujar barras completas
    for (let i = 0; i < wholeParts; i++) {
      const row = Math.floor(barIndex / barsPerRow);
      const col = barIndex % barsPerRow;
      
      const x = startX + col * (barWidth + spacingX);
      const y = startY + row * (barHeight + spacingY);
      
      drawSingleFractionBar(ctx, denominador, denominador, x, y, barWidth, barHeight, '#3B82F6');
      barIndex++;
    }

    // Dibujar la barra del resto
    if (remainder > 0 || (numerador === 0 && denominador > 0)) {
      const row = Math.floor(barIndex / barsPerRow);
      const col = barIndex % barsPerRow;
      
      const x = startX + col * (barWidth + spacingX);
      const y = startY + row * (barHeight + spacingY);
      
      const nToDraw = (numerador === 0 && denominador > 0) ? 0 : remainder;
      drawSingleFractionBar(ctx, nToDraw, denominador, x, y, barWidth, barHeight, '#3B82F6');
    }

  }, [numerador, denominador]);

  return (
    <canvas
      ref={canvasRef}
      width={350}
      height={200}
      className="border border-gray-300 rounded-lg bg-white"
      style={{ width: '100%', height: 'auto', maxWidth: '400px' }}
    />
  );
};

export default FractionCanvas;