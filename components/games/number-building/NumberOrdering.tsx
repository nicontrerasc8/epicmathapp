'use client'

import { useState } from 'react'

const generateNumbers = () => {
  const numbers : any = []
  while (numbers.length < 5) {
    const num = Math.floor(Math.random() * 100) + 1 // Números del 1 al 100
    if (!numbers.includes(num)) {
      numbers.push(num)
    }
  }
  return numbers
}

export function NumberOrdering() {
  const [numbers, setNumbers] = useState(generateNumbers())
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [success, setSuccess] = useState(false)

  const handleSelect = (num: number) => {
    if (selectedNumbers.includes(num)) return
    const newSelected = [...selectedNumbers, num]
    setSelectedNumbers(newSelected)

    if (newSelected.length === numbers.length) {
      const sortedOriginal = [...numbers].sort((a, b) => a - b)
      if (JSON.stringify(newSelected) === JSON.stringify(sortedOriginal)) {
        setSuccess(true)
      } else {
        setSuccess(false)
      }
    }
  }

  const handleReset = () => {
    setNumbers(generateNumbers())
    setSelectedNumbers([])
    setSuccess(false)
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <h2 className="text-2xl font-bold text-primary text-center">Ordena los números de menor a mayor</h2>

      {!success && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {numbers.map((num:any) => (
              <button
                key={num}
                onClick={() => handleSelect(num)}
                disabled={selectedNumbers.includes(num)}
                className={`p-6 text-xl font-bold rounded-xl transition ${
                  selectedNumbers.includes(num)
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-card hover:bg-accent cursor-pointer'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {selectedNumbers.map((num, index) => (
              <div
                key={index}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-lg font-semibold"
              >
                {num}
              </div>
            ))}
          </div>
        </>
      )}

      {success && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-green-500 mb-4">¡Muy bien! 🎉</h3>
          <button
            onClick={handleReset}
            className="mt-4 bg-primary hover:bg-primary/80 text-white font-bold py-2 px-6 rounded-full transition"
          >
            Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}
