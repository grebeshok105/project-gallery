import {
  Sparkles, Layers, Library, CheckCircle, Trophy, Code, Binary, Star,
  Heart, Github, Target, Award, Rocket, Flame, Zap, Crown, Medal,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  layers: Layers,
  library: Library,
  "check-circle": CheckCircle,
  trophy: Trophy,
  code: Code,
  binary: Binary,
  star: Star,
  heart: Heart,
  github: Github,
  target: Target,
  award: Award,
  rocket: Rocket,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  medal: Medal,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = MAP[name] ?? Trophy;
  return <Cmp className={className} />;
}

export const ICON_CHOICES = Object.keys(MAP);
