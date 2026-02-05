"use client"

import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(useGSAP)

interface CountUpProps {
  value: number
  decimals?: number
}

/**
 * Animated number counter using GSAP
 */
export function CountUp({ value, decimals = 2 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const obj = { val: 0 }
    gsap.to(obj, {
      val: value,
      duration: 1.5,
      ease: "power3.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.innerText = obj.val.toFixed(decimals)
        }
      }
    })
  }, [value])

  return <span ref={ref}>0.00</span>
}
