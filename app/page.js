"use client"
import { Mea_Culpa } from "next/font/google";
import { userAgent } from "next/server";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
     {
        role: "assisstant",
        content: "Hi! I am the rate my professor support asssistant. How can I help you today?"  
     }
  ])

  const [messages, setMessages] = useState('')
  
  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      {role: "user", content: message}
      {role: "assistant", content: ' '}
    ])

    setMessages('' )
    
    const response =  fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'applications/json'
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}])
    }).then(async(res) => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let results =  ''

      return reader.read().then(funciton processText({done, value}) {
        if (done) {
          return results
        }
        const text = decoder.decode(value || new Unit8Array, {stream: true })
        setMessages((message) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1) 
          return [
            ...otherMessages,
            {...lastMessage, lastMessage.content + text},
          ]  
        })
        return reader.read().then(processText)

      }) 
    })
  }
  

  return <></>
}
