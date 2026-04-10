declare module 'flubber' {
  export function interpolate(
    fromShape: string,
    toShape: string,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;

  export function toCircle(
    fromShape: string,
    x: number,
    y: number,
    r: number,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;

  export function fromCircle(
    x: number,
    y: number,
    r: number,
    toShape: string,
    options?: { maxSegmentLength?: number; string?: boolean }
  ): (t: number) => string;
}
