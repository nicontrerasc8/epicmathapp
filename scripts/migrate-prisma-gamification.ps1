$files = Get-ChildItem -Path components\exercises\prisma -Filter 'Prisma*.tsx' |
  Where-Object { $_.Name -ne 'Prisma01.tsx' -and $_.Name -notin @('Prisma27.tsx','Prisma28.tsx','Prisma29.tsx','Prisma30.tsx') }

$hudBlock = @'
        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
          />
        </div>
'@

foreach ($f in $files) {
  $path = $f.FullName
  $content = Get-Content -Raw -Path $path

  if ($content -match "useExerciseSubmission") {
    continue
  }

  $content = $content -replace "`r?`nimport \{ persistExerciseOnce \} from '@/lib/exercises/persistExerciseOnce'`r?`n", "`r`n"

  $content = $content -replace "import \{ useExerciseEngine \} from '@/lib/exercises/useExerciseEngine'",
    "import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'`r`nimport { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'`r`nimport { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'`r`nimport { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'"

  $content = $content -replace "import \{ SolutionBox \} from '../base/SolutionBox'",
    "import { SolutionBox } from '../base/SolutionBox'`r`nimport { ExerciseHud } from '../base/ExerciseHud'"

  $content = [regex]::Replace($content, "const engine = useExerciseEngine\([^\n]+\)", {
    param($m)
    $m.Value + "`r`n  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({`r`n    exerciseId,`r`n    classroomId,`r`n    sessionId,`r`n  })`r`n  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)`r`n  const trophyPreview = computeTrophyGain(elapsed)"
  })

  $content = $content -replace "function pickOption\(", "async function pickOption("

  $content = [regex]::Replace($content, "async function pickOption\(([^)]*)\) \{`r?`n\s*if \(!engine\.canAnswer\) return`r?`n",
    "async function pickOption(`$1) {`r`n    if (!engine.canAnswer) return`r`n`r`n    const timeSeconds = (Date.now() - startedAtRef.current) / 1000`r`n")

  $content = [regex]::Replace($content, "persistExerciseOnce\(\{([\s\S]*?)\}\)`r?`n", "await submitAttempt({`$1, timeSeconds })`r`n")

  if ($content -notmatch "ExerciseHud") {
    $content = $content -replace "`r?`n\s*</ExerciseShell>", "`r`n$hudBlock      </ExerciseShell>"
  }

  Set-Content -Path $path -Value $content -Encoding UTF8
}
