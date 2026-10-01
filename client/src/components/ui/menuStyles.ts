/** Shared class strings for the GlobalLogic-style mobile menu. */

export function menuItemClass(active: boolean): string {
  return `mb-2 block w-full border-t border-[#C8CAD3] py-5 pr-[30px] text-[24px] leading-[1.3] tracking-[-0.3px] transition-colors focus-visible:outline-none focus-visible:text-[#FF5F2D] ${
    active ? 'font-bold text-[#FF5F2D]' : 'font-semibold text-[#181A24] hover:text-[#FF5F2D]'
  }`;
}

/** GlobalLogic octagon CTA (bg #FF5F2D, hover #CF3708; clip-path in index.css). */
export const glCtaClass =
  'gl-cta inline-flex items-center justify-center bg-[#FF5F2D] px-6 py-[17px] text-[18px] leading-[1.5] text-white transition-colors duration-300 ease-in-out hover:bg-[#CF3708] focus-visible:bg-[#CF3708] focus-visible:outline-none';

/** Plain text action next to the CTA (GlobalLogic's non-CTA controls are text). */
export const glSecondaryClass =
  'inline-flex items-center px-1 py-[17px] text-[18px] font-semibold text-[#181A24] transition-colors hover:text-[#FF5F2D] focus-visible:text-[#FF5F2D] focus-visible:outline-none';
