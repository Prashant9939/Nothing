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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
          {passed ? <PartyPopper size={24} /> : <BookOpen size={24} />}
        </div>
        <h3 className="mb-2 text-lg font-bold text-slate-900">
          {passed ? 'Great Job!' : 'Keep Practicing!'}
        </h3>
        <p className="mb-4 text-sm text-slate-600">
          You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          <RotateCcw className="h-4 w-4" />
          Retry Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm font-semibold text-slate-700">
          Score: {score}/{currentIndex + (showExplanation ? 1 : 0)}
        </span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
        <div 
          className="bg-slate-700 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <h4 className="mb-4 break-words text-base font-semibold text-slate-900">{currentQuestion.question}</h4>

      <div className="space-y-3 mb-6">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelect(index)}
            disabled={showExplanation}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              showExplanation
                ? index === currentQuestion.correctIndex
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : index === selectedAnswer && !isCorrect
                    ? 'border-red-300 bg-red-50 text-red-800'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                : selectedAnswer === index
                  ? 'border-slate-400 bg-slate-50 text-slate-800'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                showExplanation && index === currentQuestion.correctIndex
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : showExplanation && index === selectedAnswer && !isCorrect
                    ? 'border-red-500 bg-red-500 text-white'
                    : selectedAnswer === index
                      ? 'border-slate-600 bg-slate-600 text-white'
                      : 'border-slate-300'
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
        <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <p className={`text-sm font-medium ${isCorrect ? 'text-emerald-800' : 'text-amber-800'}`}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          <p className={`mt-1 break-words text-sm ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        {!showExplanation ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}
