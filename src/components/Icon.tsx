import {
  Sparkle, StackSimple, Books, CheckCircle, Trophy, Code, Cpu,
  Star, Heart, GithubLogo, Target, Medal, Crown, Lightning, Flame, Rocket,
  type Icon as PhosphorIcon, type IconWeight,
} from "@phosphor-icons/react";

const MAP: Record<string, PhosphorIcon> = {
  sparkles: Sparkle,
  layers: StackSimple,
  library: Books,
  "check-circle": CheckCircle,
  trophy: Trophy,
  code: Code,
  binary: Cpu,
  star: Star,
  heart: Heart,
  github: GithubLogo,
  target: Target,
  award: Medal,
  medal: Medal,
  crown: Crown,
  zap: Lightning,
  flame: Flame,
  rocket: Rocket,
};

export function Icon({
  name,
  className,
  weight = "duotone",
}: {
  name: string;
  className?: string;
  weight?: IconWeight;
}) {
  const Cmp = MAP[name] ?? Trophy;
  return <Cmp className={className} weight={weight} />;
}

export const ICON_CHOICES = Object.keys(MAP);
