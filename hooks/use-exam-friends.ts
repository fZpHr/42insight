"use client"

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'exam-tracker-friends'

export function useExamFriends() {
  const [friends, setFriends] = useState<number[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setFriends(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse friends from localStorage', e)
      }
    }
  }, [])

  const toggleFriend = (userId: number) => {
    setFriends((prev) => {
      const newFriends = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFriends))
      return newFriends
    })
  }

  const isFriend = (userId: number) => friends.includes(userId)

  return { friends, toggleFriend, isFriend }
}
