import { Button } from "./ui/button"
import { Loader2 } from 'lucide-react'

interface LoginButtonProps {
  onLogin: () => void
  isLoading: boolean
}

export function LoginButton({ onLogin, isLoading }: LoginButtonProps) {
  return (
    <Button 
      onClick={onLogin}
      className="w-full bg-[#00BABC] hover:bg-[#00A3A5] text-white"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        </>
      ) : (
        'Login with 42'
      )}
    </Button>
  )
}