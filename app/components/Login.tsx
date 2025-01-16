import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { LoginButton } from "./LoginButton"
import { Checkbox } from "./ui/checkbox"
import { useState } from 'react'

function reset() {
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
.replace(/^ +/, "")
.replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  localStorage.clear();
  sessionStorage.clear();
}

export function Login() {

  const [isLoading, setIsLoading] = useState(false)

    // const setStayConnected = (checked: boolean) => {
    //     localStorage.setItem('stayConnected', checked.toString());
    // }
  const handleLogin = async () => {
    reset();
    const loginUrl = new URL('https://api.intra.42.fr/oauth/authorize');
    const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
    if (!clientId) {
         throw new Error('NEXT_PUBLIC_CLIENT_ID is not defined');
    }
    loginUrl.searchParams.set('client_id', clientId);
    loginUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_REDIRECT_URI + '/api/auth');
    loginUrl.searchParams.set('response_type', 'code');
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false)
    document.getElementById('login')?.classList.add('animate-pulse')
    window.location.href = loginUrl.toString();
  }


//   const stayConnected = localStorage.getItem('stayConnected');
//   const getCookie = (name: string) => {
//       const value = `; ${document.cookie}`;
//       const parts = value.split(`; ${name}=`);
//       if (parts.length === 2) return parts.pop()?.split(';').shift();
//       return null;
//   };

//   const token = getCookie('token');
//   if (stayConnected === 'true' && !token) {
//     handleLogin();
//   }
  return (
    <div id="login" className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Login to access 42Insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginButton onLogin={handleLogin} isLoading={isLoading}/>
          {/* <div className="flex items-center space-x-2">
            <Checkbox 
              id="stay-connected" 
              onCheckedChange={(checked) => setStayConnected(checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="stay-connected"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Stay connected
            </label>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}

