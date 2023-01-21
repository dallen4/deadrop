import { useDrop } from 'hooks/use-drop';
import { useGrab } from 'hooks/use-grab';

export type DropContextValues = ReturnType<typeof useDrop>;

export type GrabContextValues = ReturnType<typeof useGrab>;
