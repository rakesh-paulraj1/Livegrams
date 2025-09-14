"use client"
import React from 'react'
import { useEffect,useRef } from 'react'
import { initDraw } from '../../../shapes/draw'
const page = () => {
const canvasref = useRef<HTMLCanvasElement>(null)

useEffect(()=>{
    if(canvasref.current){

 

    initDraw(canvasref.current)
    }
},[canvasref])
  return (
    <div>
        <canvas ref={canvasref} width={100} height={100}>

            </canvas>page</div>
  )
}

export default page