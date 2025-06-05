export default function Header() {
  return (
    <div className="flex flex-col items-center gap-6 text-center mt-8">
      <h1 className="text-4xl font-extrabold text-primary">
        ¡Bienvenido a EpicMathApp!
      </h1>
      <p className="text-lg max-w-2xl text-muted-foreground">
        Aprende matemáticas de forma divertida y personalizada. Sigue jugando, sube de nivel y sorprende a tus profes 💡📈
      </p>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-8" />
    </div>
  )
}
