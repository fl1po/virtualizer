import {
    createElement,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";

type Props = {
    initialVisible?: boolean;
    defaultHeight?: number;
    visibleOffset?: number;
    stayRendered?: boolean;
    root?: HTMLElement | null;
    rootElement?: string;
    rootElementClass?: string;
    placeholderElement?: string;
    placeholderElementClass?: string;
    children: ReactNode;
};

export const VirtualizedItem = ({
   initialVisible = false,
   defaultHeight = 300,
   visibleOffset = 1000,
   stayRendered = false,
   root = null,
   rootElement = "div",
   rootElementClass = "",
   placeholderElement = "div",
   placeholderElementClass = "",
   children,
}: Props) => {
    const [isVisible, setIsVisible] = useState<boolean>(initialVisible);
    const wasVisible = useRef<boolean>(initialVisible);
    const placeholderHeight = useRef<number>(defaultHeight);
    const intersectionRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousScrollY = useRef<number>(0);
    const isScrolling = useRef<boolean>(false);
    const visibilityTimeout = useRef<Timer | null>(null);

    const handleIntersection = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const entry = entries[0];
            if (!entry?.isIntersecting && contentRef.current) {
                placeholderHeight.current = contentRef.current.offsetHeight;
            }

            if (visibilityTimeout.current) {
                clearTimeout(visibilityTimeout.current);
            }

            visibilityTimeout.current = setTimeout(() => {
                setIsVisible(entry?.isIntersecting ?? false);
            }, 100);
        },
        [],
    );

    useEffect(() => {
        const observer = new IntersectionObserver(handleIntersection, {
            root,
            rootMargin: `${visibleOffset}px 0px ${visibleOffset}px 0px`,
            threshold: 0,
        });

        if (intersectionRef.current) {
            observer.observe(intersectionRef.current);
        }

        return () => {
            observer.disconnect();
            if (visibilityTimeout.current) {
                clearTimeout(visibilityTimeout.current);
            }
        };
    }, [handleIntersection, root, visibleOffset]);

    useEffect(() => {
        if (isVisible) {
            wasVisible.current = true;
        }
    }, [isVisible]);

    useEffect(() => {
        const handleScroll = () => {
            previousScrollY.current = window.scrollY;
            if (!isScrolling.current) {
                isScrolling.current = true;
                requestAnimationFrame(() => {
                    isScrolling.current = false;
                });
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isVisible && contentRef.current) {
            const currentHeight = contentRef.current.offsetHeight;
            const heightDiff = currentHeight - placeholderHeight.current;
            if (Math.abs(heightDiff) > 1) {
                window.scrollTo(0, previousScrollY.current + heightDiff);
                placeholderHeight.current = currentHeight;
            }
        }
    }, [isVisible]);

    const rootClasses = useMemo(
        () => `virtualized ${rootElementClass}`.trim(),
        [rootElementClass],
    );
    const placeholderClasses = useMemo(
        () => `virtualized-placeholder ${placeholderElementClass}`.trim(),
        [placeholderElementClass],
    );

    const shouldRender =
        isVisible || (stayRendered && wasVisible.current) || isScrolling.current;

    const content = shouldRender ? (
        <div ref={contentRef} style={{ minHeight: placeholderHeight.current }}>
            {children}
        </div>
    ) : (
        createElement(placeholderElement, {
            className: placeholderClasses,
            style: { height: placeholderHeight.current },
        })
    );

    return createElement(rootElement, {
        ref: intersectionRef,
        className: rootClasses,
        children: content,
    });
};
