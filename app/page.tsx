'use client'

import { useState } from 'react'
import * as React from 'react'
import { Menu } from 'lucide-react'
import { ProfilePicture } from './components/ui/ProfilePicture'
import { Button } from "./components/ui/button"
import RankingList from "./components/RankingList"
import Trombinoscope from "./components/Trombinoscope"
import Sidebar from "./components/Sidebar"
import { DarkModeToggle } from "./components/DarkModeToggle"
import { useEffect } from 'react'
import { Login } from './components/Login'
import { Loader } from 'lucide-react'
import Contribute from './components/Contribute'
import UsefulLinks from './components/UsefulLinks'
import ExamTracker from './components/examTracker'
import ClusterMap from './components/ClusterMap'
import Games from './components/Games'
import Head from 'next/head';

export default function Home() {

  const [activeView, setActiveView] = useState('rankings')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderContent = () => {
    switch (activeView) {
      case 'rankings':
        return <RankingList />
      case 'trombinoscope':
        return <Trombinoscope />
      case 'contribute':
        return <Contribute />
      case 'useful-links':
        return <UsefulLinks />
      case 'exam-tracker':
        return <ExamTracker />
      //case 'cluster-map':
      //  return <ClusterMap />
      // case 'games':
      //   return <Games />
      default:
        return <RankingList />
    }
  }

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        setIsLoggedIn(false);
        return;
      }
      try {
        const response = await fetch('/api/getter', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const userData = {
          login: data.login,
          profilePicture: data.image.versions.small,
          time: await (await fetch('/api/time')).json()
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setIsLoggedIn(response.ok);
      } catch (error) {
        console.error('Authentication Error:', error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoggedIn === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Login />
  }

  return (
    <div className="flex h-screen bg-background">
      <Head>
        <title>42 Insight</title>
      </Head>
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card shadow-sm z-10">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-foreground"></h1>
            <div className="flex items-center space-x-4">
              <DarkModeToggle />
              <ProfilePicture />
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

