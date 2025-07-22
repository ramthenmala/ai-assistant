import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Shield, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export const RegistrationVerification: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const navigate = useNavigate();
  const verifyEmail = useAuthStore((state) => state.verifyEmail);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      pastedData.split('').forEach((digit, index) => {
        if (index < 6) {
          newOtp[index] = digit;
        }
      });
      setOtp(newOtp);
      
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.every(digit => digit !== '')) {
      setIsLoading(true);
      setError('');
      try {
        const code = otp.join('');
        const success = await verifyEmail(code);
        if (success) {
          navigate('/');
        } else {
          setError('Invalid verification code. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResend = () => {
    setTimer(30);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    console.log('OTP resent');
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <AuthLayout 
      title="Verify Your Email" 
      subtitle="We've sent a verification code to your email address"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="\d{1}"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-12 text-center text-lg font-semibold"
                required
              />
            ))}
          </div>

          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Code expires in{' '}
            <span className={`font-medium ${timer <= 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </span>
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={!isComplete || isLoading}
        >
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Didn't receive the code?
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={timer > 0}
            className="text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Resend Code
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Wrong email address?{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Update email
              </a>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Having trouble?{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};