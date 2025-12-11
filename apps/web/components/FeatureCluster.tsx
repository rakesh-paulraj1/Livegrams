"use client"
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function FeatureCluster() {
  const [isCliHovering, setIsCliHovering] = useState(false)

  const leftItems = ["AI Canvas", "Created with LangGraph", "Conversational Agent"]
  const rightItems = ["Colaborate", "Live-updates", "Mobile Support"]

  return (
    <div className="py-12">
      <div className="relative">
        <div className="flex items-center justify-center">
          <div
            className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full max-w-4xl px-4"
            onMouseEnter={() => setIsCliHovering(true)}
            onMouseLeave={() => setIsCliHovering(false)}
          >
            <div className="flex flex-col gap-4 w-full md:w-auto">
              {leftItems.map((item, index) => (
                <motion.div
                  key={`left-${index}`}
                  className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 text-black text-base md:text-lg font-semibold shadow-md w-full"
                  initial={{ opacity: 1, x: 0 }}
                  animate={isCliHovering ? { x: [-24, 0] } : { x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  whileHover={{ scale: 1.06 }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {index === 0 && <span className="text-base">😎 </span>}
                    {index === 1 && <span className="text-base">🦾</span>}
                    {index === 2 && <span className="text-base">🏢</span>}
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>

            <motion.div
              className="w-24 h-24 md:w-28 md:h-28 border border-gray-300 rounded-lg overflow-hidden shadow-lg my-6 md:my-0"
              initial={{ opacity: 1, scale: 1 }}
              animate={isCliHovering ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              whileHover={{ scale: 1.12, rotate: 6 }}
            >
              <Image
                src="https://framerusercontent.com/images/q43ivjLz67lXhWf6TKfLIh0FY.png"
                alt="Logo"
              width={100}
              height={100}
              />
            </motion.div>

            <div className="flex flex-col gap-4 w-full md:w-auto">
              {rightItems.map((item, index) => (
                <motion.div
                  key={`right-${index}`}
                  className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 text-black text-base md:text-lg font-semibold shadow-md w-full"
                  initial={{ opacity: 1, x: 0 }}
                  animate={isCliHovering ? { x: [24, 0] } : { x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  whileHover={{ scale: 1.06 }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {index === 0 && <span className="text-base">🎲</span>}
                    {index === 1 && <span className="text-base">🧩</span>}
                    {index === 2 && <span className="text-base">📱</span>}
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="h-80" />
    </div>
  )
}
