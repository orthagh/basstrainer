import { Icon, addCollection } from '@iconify/react';
import { icons } from '@iconify-json/qlementine-icons';

addCollection(icons);

type InstrumentType =
  | 'guitar-classical'
  | 'guitar-folk'
  | 'guitar-electric'
  | 'guitar-heavy'
  | 'bass'
  | 'drums'
  | 'keys'
  | 'vocals'
  | 'synth'
  | 'note';

const ICON_MAP: Record<InstrumentType, string> = {
  'guitar-classical': 'qlementine-icons:guitar-classical-16',
  'guitar-folk':      'qlementine-icons:guitar-folk-16',
  'guitar-electric':  'qlementine-icons:guitar-strat-16',
  'guitar-heavy':     'qlementine-icons:guitar-jackson-16',
  'bass':             'qlementine-icons:bass-16',
  'drums':            'qlementine-icons:drumkit-16',
  'keys':             'qlementine-icons:piano-16',
  'vocals':           'qlementine-icons:microphone-16',
  'synth':            'qlementine-icons:synthesizer-16',
  'note':             'qlementine-icons:notes-16',
};

interface InstrumentIconProps {
  label: string;
  size?: number | string;
  className?: string;
}

export default function InstrumentIcon({ label, size = 18, className }: InstrumentIconProps) {
  const type = getIconTypeFromLabel(label);
  return (
    <Icon
      icon={ICON_MAP[type]}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}

export function getIconTypeFromLabel(label: string): InstrumentType {
  const l = label.toLowerCase();

  if (/vocal|voice|singer/i.test(l)) return 'vocals';
  if (/bass/i.test(l)) return 'bass';
  if (/drum|percussion|kit|kick|snare|hi.?hat/i.test(l)) return 'drums';
  if (/piano|keys|keyboard/i.test(l)) return 'keys';

  // Guitar variants — specific before generic
  if (/classical|nylon/i.test(l)) return 'guitar-classical';
  if (/folk|acoustic/i.test(l)) return 'guitar-folk';
  if (/heavy|metal|distortion|djent/i.test(l)) return 'guitar-heavy';
  if (/guitar|gtr|electric|strat|tele|rhythm|lead/i.test(l)) return 'guitar-electric';

  if (/synth|pad|arp|effect|string/i.test(l)) return 'synth';

  return 'note';
}
