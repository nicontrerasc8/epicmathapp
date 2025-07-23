'use client'

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

    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Validación
    if (denominador <= 0 || numerador < 0) {
      ctx.fillStyle = '#EF4444'; // Rojo para error
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Valores inválidos', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Parámetros
    const padding = 15;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2;

    // Umbral para simplificación extrema
    const MAX_GRID_CELLS = 100;

    if (denominador > MAX_GRID_CELLS) {
      // Mostrar fracción como texto por legibilidad
      ctx.fillStyle = '#374151';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${numerador}/${denominador} (Fracción muy grande para visualizar)`, canvas.width / 2, canvas.height / 2);
      return;
    }

    // --- Cuadrícula adaptable ---
    let filas = Math.ceil(Math.sqrt(denominador));
    filas = Math.min(Math.max(filas, 1), 10); // entre 1 y 10 filas
    const columnas = Math.ceil(denominador / filas);

    const cellPadding = 4;
    const cellWidth = (availableWidth - (columnas - 1) * cellPadding) / columnas;
    const cellHeight = (availableHeight - (filas - 1) * cellPadding) / filas;

    const startX = padding + (availableWidth - (cellWidth * columnas + cellPadding * (columnas - 1))) / 2;
    const startY = padding + (availableHeight - (cellHeight * filas + cellPadding * (filas - 1))) / 2;

    let contador = 0;
    for (let row = 0; row < filas; row++) {
      for (let col = 0; col < columnas; col++) {
        if (contador >= denominador) break;

        const x = startX + col * (cellWidth + cellPadding);
        const y = startY + row * (cellHeight + cellPadding);

        // Relleno
        if (contador < numerador) {
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }

        // Borde
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        contador++;
      }
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
