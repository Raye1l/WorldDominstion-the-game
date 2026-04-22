import { Globe } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, string> = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
};

export function GameLogo({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: Size;
}) {
  return (
    <div className={`flex flex-col items-center justify-center font-black uppercase leading-[0.9] drop-shadow-md ${sizeClasses[size]} ${className}`}>
      <div className="flex items-center">
        <span>МИР</span>
        <Globe className="w-[0.9em] h-[0.9em] mx-[0.05em]" strokeWidth={2.5} />
        <span>ВОЕ</span>
      </div>
      <div className="mt-[0.1em]">ГОСПОДСТВО</div>
    </div>
  );
}
