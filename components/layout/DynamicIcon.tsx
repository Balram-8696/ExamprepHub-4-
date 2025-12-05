
import React from 'react';
import {
  HardHat, Wrench, Stethoscope, HeartPulse, FlaskConical, Atom,
  Server, Code, ScrollText, Landmark, Globe, Map as MapIcon, Paintbrush,
  Briefcase, DollarSign, Gavel, Scale, BookOpen, Sigma, Music,
  Trophy, BrainCircuit, Lightbulb, Puzzle, Star, Shapes, HelpCircle,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  className?: string;
}

// Using a Map for slightly better performance on lookups
const iconMap = new Map<string, React.FC<LucideProps>>([
  ['engineering', HardHat],
  ['mechanical', Wrench],
  ['medical', Stethoscope],
  ['health', HeartPulse],
  ['science', FlaskConical],
  ['physics', Atom],
  ['chemistry', FlaskConical],
  ['computer', Server],
  ['technology', Server],
  ['programming', Code],
  ['it', Code],
  ['history', ScrollText],
  ['civics', Landmark],
  ['geography', Globe],
  ['map', MapIcon],
  ['art', Paintbrush],
  ['design', Paintbrush],
  ['business', Briefcase],
  ['finance', DollarSign],
  ['commerce', DollarSign],
  ['law', Gavel],
  ['legal', Scale],
  ['literature', BookOpen],
  ['english', BookOpen],
  ['math', Sigma],
  ['music', Music],
  ['sport', Trophy],
  ['general knowledge', BrainCircuit],
]);

const defaultIcons: React.FC<LucideProps>[] = [Puzzle, Star, Shapes, HelpCircle, Lightbulb, BrainCircuit];

const stringToHash = (str: string): number => {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const DynamicIcon: React.FC<DynamicIconProps> = ({ name = 'default', className }) => {
  const lowerCaseName = name.toLowerCase();
  
  // Find the first matching keyword
  for (const [key, IconComponent] of iconMap.entries()) {
    if (lowerCaseName.includes(key)) {
      return <IconComponent className={className} aria-hidden="true" />;
    }
  }

  // Fallback to a default icon based on hash to ensure variety
  const hash = stringToHash(lowerCaseName);
  const DefaultIcon = defaultIcons[hash % defaultIcons.length];
  
  return <DefaultIcon className={className} aria-hidden="true" />;
};

export default DynamicIcon;
