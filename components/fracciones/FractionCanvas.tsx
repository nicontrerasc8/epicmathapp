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
    if (denominador <= 0 || numerador < 0) {
      ctx.fillStyle = '#EF4444'; // Rojo para error
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Valores inválidos', canvas.width / 2, canvas.height / 2);
      return;
    }

    // --- Parámetros de dibujo ---
    const padding = 15;
    const availableWidth = canvas.width - (padding * 2);
    const availableHeight = canvas.height - (padding * 2);

    // Calcular partes enteras y el resto
    const wholeParts = Math.floor(numerador / denominador);
    const remainder = numerador % denominador;

    // Determinar el número de barras necesarias para la visualización
    let barsToDraw = wholeParts;
    if (remainder > 0 || (numerador === 0 && denominador > 0)) {
      barsToDraw += 1;
    }

    // --- Umbral para cambiar a representación simplificada ---
    const MAX_VISUAL_BARS = 20; // Número máximo de barras individuales a dibujar

    if (barsToDraw > MAX_VISUAL_BARS) {
      // --- Representación Simplificada ---
      ctx.fillStyle = '#374151'; // Color de texto
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let displayLines: string[] = [];

      if (wholeParts > 0) {
        displayLines.push(`${wholeParts} unidades completas`);
      }
      
      if (remainder > 0) {
        displayLines.push(`Más ${remainder}/${denominador} de unidad`);
      } else if (numerador === 0 && denominador > 0) {
        displayLines.push(`0/${denominador} de unidad`);
      }
      
      if (wholeParts === 0 && remainder === 0 && numerador === 0) {
        displayLines.push('0 unidades');
      }

      displayLines.push('(Representación simplificada)');


      const lineHeight = 25;
      const startY = canvas.height / 2 - (displayLines.length - 1) * lineHeight / 2;

      displayLines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
      });

      return; // Salir, ya se dibujó la representación simplificada
    }

    // --- Lógica de dibujo para números manejables ---

    // Calcular layout óptimo según el número de barras
    let barsPerRow, numberOfRows, barWidth, barHeight;

    if (barsToDraw <= 3) {
      barsPerRow = barsToDraw;
      numberOfRows = 1;
      barWidth = Math.min(120, (availableWidth - (barsPerRow - 1) * 10) / barsPerRow);
      barHeight = Math.min(60, availableHeight - 20);
    } else if (barsToDraw <= 12) {
      barsPerRow = Math.min(4, Math.ceil(Math.sqrt(barsToDraw)));
      numberOfRows = Math.ceil(barsToDraw / barsPerRow);
      barWidth = Math.min(80, (availableWidth - (barsPerRow - 1) * 8) / barsPerRow);
      barHeight = Math.min(40, (availableHeight - (numberOfRows - 1) * 8) / numberOfRows);
    } else {
      // Para un número de barras "grande" pero aún visualizable (hasta MAX_VISUAL_BARS)
      barsPerRow = Math.min(6, Math.floor(availableWidth / 50));
      numberOfRows = Math.ceil(barsToDraw / barsPerRow);
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

      // Dibujar las divisiones internas (solo si es visualmente útil y el denominador no es demasiado grande)
      const maxDivisionsToDraw = 12; // Aumentado a 12
      if (d <= maxDivisionsToDraw && width > 30) { // Umbral de ancho reducido a 30
        ctx.strokeStyle = '#6B7280';
        ctx.lineWidth = 1;
        for (let i = 1; i < d; i++) {
          const divX = x + (i / d) * width;
          ctx.beginPath();
          ctx.moveTo(divX, y + 1);
          ctx.lineTo(divX, y + height - 1);
          ctx.stroke();
        }
      } else if (d > maxDivisionsToDraw && width > 50) { // Umbral de ancho ajustado a 50
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

    // Dibujar la barra del resto (si aplica)
    if (remainder > 0 || (numerador === 0 && denominador > 0 && barsToDraw > 0)) {
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
      width={350} // Puedes ajustar el ancho y alto base del canvas
      height={200}
      className="border border-gray-300 rounded-lg bg-white"
      style={{ width: '100%', height: 'auto', maxWidth: '400px' }} // Estilos CSS para el tamaño visible
    />
  );
};

export default FractionCanvas;