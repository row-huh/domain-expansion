// ryoiki tenkai

"use client"

import {useRef} from "react"
import CameraFeed from "@/components/CameraFeed";


export default function GojoDomainExpansion() {
    return(
        <div>
            <p>RYOIKI TENKAI</p>
            <CameraFeed />
        </div>
    )
}


// todos
// show webcamera - DONE
// show mediapipe hand detection overlay
// come up with an algorithm to detect gojo's domain expansion sign