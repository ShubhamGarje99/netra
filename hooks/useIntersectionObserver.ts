import { useEffect, useState, RefObject } from 'react';

export function useIntersectionObserver(
  elementRef: RefObject<Element | null>,
  { threshold = 0, root = null, rootMargin = '0%' } = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const node = elementRef?.current;
    
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, threshold, root, rootMargin]);

  return isIntersecting;
}
