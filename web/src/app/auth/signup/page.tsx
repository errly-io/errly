'use client';

import { useState } from 'react';
import { Button, TextInput, Paper, Title, Container, Text, Alert, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconAlertCircle } from '@tabler/icons-react';
import { registerUser } from '../../../modules/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      name: (value) => (value.trim().length >= 2 ? null : 'Name must be at least 2 characters'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password should include at least 6 characters'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Passwords do not match',
    },
  });

  async function handleSignUp(values: typeof form.values) {
    try {
      setGeneralError(null);
      form.clearErrors();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registrationData } = values;
      await registerUser(registrationData);
      alert('Registration successful! Please sign in.');
      router.push('/auth/signin');
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = 'An unknown error occurred during registration.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (errorMessage.toLowerCase().includes('email')) {
        form.setFieldError('email', errorMessage);
      } else if (errorMessage.toLowerCase().includes('name')) {
        form.setFieldError('name', errorMessage);
      } else if (errorMessage.toLowerCase().includes('password')) {
        form.setFieldError('password', errorMessage);
      } else {
        setGeneralError(errorMessage);
      }
    }
  }

  return (
    <Container size={420} my={40}>
      <Title order={1} ta="center" mb="xl">
        Errly
      </Title>
      <Title ta="center">
        Create an account
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Link href="/auth/signin" passHref legacyBehavior>
          <Anchor size="sm" component="button">
            Sign in
          </Anchor>
        </Link>
      </Text>

      <Paper withBorder p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSignUp)}>
          {generalError && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Registration Failed"
              color="red"
              withCloseButton
              onClose={() => setGeneralError(null)}
              mb="md"
            >
              {generalError}
            </Alert>
          )}
          <TextInput
            label="Name"
            placeholder="Your name"
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            mt="md"
            {...form.getInputProps('email')}
          />
          <TextInput
            type="password"
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps('password')}
          />
          <TextInput
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            mt="md"
            {...form.getInputProps('confirmPassword')}
          />
          <Button type="submit" fullWidth mt="xl">
            Sign up
          </Button>
        </form>
      </Paper>
    </Container>
  );
}