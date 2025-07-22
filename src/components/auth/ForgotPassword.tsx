import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, Mail } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <AuthLayout 
        title="Check Your Email" 
        subtitle="We've sent you a password reset link"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              We've sent a password reset link to
            </p>
            <p className="font-medium text-gray-900 dark:text-white">
              {email}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Didn't receive the email? Check your spam folder or try resending the link.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => setIsSubmitted(false)} 
              variant="outline" 
              className="w-full"
            >
              Send Again
            </Button>
            
            <Link 
              to="/login" 
              className="block text-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="inline w-4 h-4 mr-1" />
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Forgot Password?" 
      subtitle="No worries, we'll send you reset instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>
        </div>

        <Button type="submit" className="w-full">
          Send Reset Link
        </Button>

        <div className="text-center">
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};