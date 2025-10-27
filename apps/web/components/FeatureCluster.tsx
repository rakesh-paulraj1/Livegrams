"use client"
import React, { useState } from 'react'
import { motion } from 'framer-motion'

export default function FeatureCluster() {
  const [isCliHovering, setIsCliHovering] = useState(false)

  const leftItems = ["Feature-1", "Feature-1", "Feature-1"]
  const rightItems = ["Feature-1", "Feature-1", "Feature-1"]

  return (
    <div className="py-12">
      <div className="relative">
        <div className="flex items-center justify-center">
          <div
            className="flex items-center gap-12"
            onMouseEnter={() => setIsCliHovering(true)}
            onMouseLeave={() => setIsCliHovering(false)}
          >
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              {leftItems.map((item, index) => (
                <motion.div
                  key={`left-${index}`}
                  className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 text-black text-base md:text-lg font-semibold shadow-md"
                  initial={{ opacity: 1, x: 0 }}
                  animate={isCliHovering ? { x: [-24, 0] } : { x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  whileHover={{ scale: 1.06 }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {index === 0 && <span className="text-base">📄</span>}
                    {index === 1 && <span className="text-base">💰</span>}
                    {index === 2 && <span className="text-base">🏢</span>}
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>

            {/* Center Logo */}
            <motion.div
              className="w-24 h-24 md:w-28 md:h-28 border border-gray-300 rounded-lg overflow-hidden shadow-lg"
              initial={{ opacity: 1, scale: 1 }}
              animate={isCliHovering ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              whileHover={{ scale: 1.12, rotate: 6 }}
            >
              <img
                src="https://framerusercontent.com/images/q43ivjLz67lXhWf6TKfLIh0FY.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Right Column */}
            <div className="flex flex-col gap-4">
              {rightItems.map((item, index) => (
                <motion.div
                  key={`right-${index}`}
                  className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 text-black text-base md:text-lg font-semibold shadow-md"
                  initial={{ opacity: 1, x: 0 }}
                  animate={isCliHovering ? { x: [24, 0] } : { x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  whileHover={{ scale: 1.06 }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {index === 0 && <span className="text-base">👥</span>}
                    {index === 1 && <span className="text-base">💳</span>}
                    {index === 2 && <span className="text-base">👨‍⚕️</span>}
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
