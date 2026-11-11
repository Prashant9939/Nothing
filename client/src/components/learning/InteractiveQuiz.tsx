import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, PartyPopper, BookOpen } from 'lucide-react';
import type { QuizQuestion } from '../../api';

interface InteractiveQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export default function InteractiveQuiz({ questions, onComplete }: InteractiveQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion?.correctIndex;

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setShowExplanation(true);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      const finalScore = Math.round((score / questions.length) * 100);
      setIsCompleted(true);
      onComplete(finalScore);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers(new Array(questions.length).fill(null));
    setIsCompleted(false);
  };

  if (isCompleted) {
    const passed = score >= questions.length * 0.7;
    return (
      <div className="rounded-[24px] border border-sand bg-alabaster p-8 text-center shadow-bento">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${passed ? 'border-burnt/20 bg-burnt-tint text-burnt' : 'border-sand bg-cream text-charcoal'}`}>
          {passed ? <PartyPopper size={24} /> : <BookOpen size={24} />}
        </div>
        <h3 className="mb-2 font-display text-lg font-bold text-ink">
          {passed ? 'Great Job!' : 'Keep Practicing!'}
        </h3>
        <p className="mb-4 text-sm text-charcoal">
          You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-xl border border-sand bg-cream px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-sand-dark hover:bg-alabaster focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <RotateCcw className="h-4 w-4" />
          Retry Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-sand bg-alabaster p-6 shadow-bento">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm text-charcoal">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="font-mono text-sm font-bold text-ink">
          Score: {score}/{currentIndex + (showExplanation ? 1 : 0)}
        </span>
      </div>

      <div className="w-full bg-sand rounded-full h-2 mb-6">
        <div 
          className="bg-burnt h-2 rounded-full transition-all duration-300" 
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h4 className="mb-4 break-words font-display text-base font-bold text-ink">{currentQuestion.question}</h4>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            disabled={showExplanation}
            className={`w-full text-left p-4 rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
              showExplanation
                ? index === currentQuestion.correctIndex
                  ? 'border-burnt bg-burnt-tint text-ink'
                  : index === selectedAnswer && !isCorrect
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-sand bg-cream/60 text-charcoal'
                : selectedAnswer === index
                  ? 'border-burnt bg-burnt-tint text-ink font-medium'
                  : 'border-sand hover:border-sand-dark text-charcoal'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                showExplanation && index === currentQuestion.correctIndex
                  ? 'border-burnt bg-burnt text-cream'
                  : showExplanation && index === selectedAnswer && !isCorrect
                    ? 'border-red-500 bg-red-500 text-white'
                    : selectedAnswer === index
                      ? 'border-burnt bg-burnt text-cream'
                      : 'border-sand'
              }`}>
                {showExplanation && index === currentQuestion.correctIndex ? (
                  <CheckCircle className="w-4 h-4" />
                ) : showExplanation && index === selectedAnswer && !isCorrect ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="min-w-0 break-words text-sm">{option}</span>
            </div>
          </button>
        ))}
      </div>

      {showExplanation && (
        <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-burnt-tint border border-burnt/25' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm font-semibold ${isCorrect ? 'text-burnt' : 'text-red-600'}`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          <p className={`mt-1 break-words text-sm ${isCorrect ? 'text-charcoal' : 'text-red-700'}`}>
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        {!showExplanation ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="rounded-xl bg-burnt px-6 py-2 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-colors hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="rounded-xl bg-burnt px-6 py-2 text-sm font-semibold text-cream shadow-md shadow-burnt/30 transition-colors hover:bg-burnt-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}
