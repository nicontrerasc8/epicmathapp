// components/FractionCanvas.tsx
import React, { useRef, useEffect } from 'react';

interface FractionCanvasProps {
  numerador: number;
  denominador: number;
  // Puedes añadir más props si las necesitas en el futuro, pero para esta lógica no son estrictamente necesarias
  // operador?: string;
  // numerador2?: number;
  // denominador2?: number;
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

    // --- Parámetros de dibujo ---
    const barWidth = canvas.width * 0.8; // Ancho de cada barra
    const barHeight = 30; // Altura de cada barra
    const paddingY = 10; // Espacio vertical entre barras
    const textOffset = 25; // Espacio debajo de la barra para el texto de la fracción

    // Calcular partes enteras y el resto
    const wholeParts = Math.floor(numerador / denominador);
    const remainder = numerador % denominador;

    // Calcular el número total de barras a dibujar
    let numberOfBars = wholeParts;
    if (remainder > 0) {
      numberOfBars += 1; // Si hay un resto, se necesita una barra extra para la fracción
    }
    // Si el numerador es 0 y el denominador no, dibujar una barra vacía
    if (numerador === 0 && denominador > 0) {
        numberOfBars = 1;
    } else if (numerador === 0 && denominador === 0) { // Evitar división por cero
        numberOfBars = 0;
    }


    // Ajustar la altura del canvas si necesitamos más espacio para múltiples barras
    // Opcional: podrías ajustar la altura del canvas dinámicamente si es necesario,
    // o asegurarte de que el contenedor del canvas sea lo suficientemente alto.
    // Por ahora, asumimos que height={150} es suficiente para la mayoría de los casos.
    const totalContentHeight = (barHeight + paddingY) * numberOfBars + textOffset;
    let currentY = (canvas.height - totalContentHeight) / 2; // Inicia centrado verticalmente


    // --- Función auxiliar para dibujar una barra de fracción ---
    const drawSingleFractionBar = (
      ctx: CanvasRenderingContext2D,
      n: number, // Numerador para esta barra específica
      d: number, // Denominador base
      x: number,
      y: number,
      width: number,
      height: number,
      fillColor: string
    ) => {
      // Dibujar el contorno completo de la barra
      ctx.strokeStyle = '#333'; // Borde oscuro
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Dibujar las partes llenas
      const filledWidth = (n / d) * width;
      ctx.fillStyle = fillColor; // Color de relleno
      ctx.fillRect(x, y, filledWidth, height);

      // Dibujar las divisiones dentro de la barra
      ctx.fillStyle = '#333'; // Color de las líneas divisorias
      for (let i = 1; i < d; i++) {
        const divX = x + (i / d) * width;
        ctx.fillRect(divX - 1, y, 2, height); // Línea divisoria
      }
    };


    // --- Dibujar las barras completas ---
    for (let i = 0; i < wholeParts; i++) {
      const startX = (canvas.width - barWidth) / 2;
      drawSingleFractionBar(ctx, denominador, denominador, startX, currentY, barWidth, barHeight, '#60A5FA'); // Barra completa
      currentY += barHeight + paddingY; // Mover Y para la siguiente barra
    }

    // --- Dibujar la barra del resto (si existe) o la barra vacía si es 0/d ---
    if (remainder > 0 || (numerador === 0 && denominador > 0)) {
      const startX = (canvas.width - barWidth) / 2;
      const nToDraw = (numerador === 0 && denominador > 0) ? 0 : remainder; // Si es 0/d, dibuja 0 partes
      drawSingleFractionBar(ctx, nToDraw, denominador, startX, currentY, barWidth, barHeight, '#60A5FA');
      currentY += barHeight + paddingY;
    }


    // --- Mostrar la fracción como texto debajo de las barras ---
    ctx.fillStyle = '#1F2937'; // Color de texto
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';

    let fractionText = '';
    if (wholeParts > 0 && remainder > 0) {
      fractionText = `${wholeParts} y ${remainder}/${denominador}`;
    } else if (wholeParts > 0 && remainder === 0) {
      fractionText = `${wholeParts}`; // Solo el número entero si es una fracción exacta (e.g., 12/4 = 3)
    } else if (numerador > 0 && remainder > 0) { // Si es una fracción propia (numerador < denominador)
      fractionText = `${numerador}/${denominador}`;
    } else if (numerador === 0 && denominador > 0) { // Si es 0/d
        fractionText = `0/${denominador}`;
    } else { // Caso de error o 0/0
        fractionText = `${numerador}/${denominador}`;
    }


    // Ajustar la posición Y del texto final para que esté debajo de la última barra dibujada.
    const lastBarBottom = currentY - paddingY; // Restar el último padding
  


  }, [numerador, denominador]); // Re-dibuja cuando cambian numerador o denominador

  return (
    <canvas
      ref={canvasRef}
      width={300} // Ancho fijo, ajusta según necesites
      height={150} // Alto fijo, ajusta según necesites. Puede que necesites más si hay muchas barras.
      className="border border-gray-300 rounded-lg bg-gray-50 mt-2"
    />
  );
};

export default FractionCanvas;