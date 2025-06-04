'use client';

import { signIn } from 'next-auth/react';
import { Button, TextInput, Paper, Title, Container, Group, Text, Anchor, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/default/issues';

  const form = useForm({
    initialValues: {
      email: '',
      password: 'password',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password should include at least 6 characters'),
    },
  });

  async function handleCredentialsSignIn(values: typeof form.values) {
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl,
    });

    if (result?.error) {
      // Display error, for example, using Mantine Notifications
      console.error("Sign in error:", result.error);
      alert(`Sign in failed: ${result.error}`); // Replace with more user-friendly notification
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  }

  async function handleGoogleSignIn() {
    await signIn('google', { callbackUrl });
  }

  return (
    <Container size={420} my={40}>
      <Title order={1} ta="center" mb="xl">
        Errly
      </Title>
      <Title ta="center">
        Welcome back!
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Link href="/auth/signup" passHref legacyBehavior>
          <Anchor size="sm" component="button">
            Create account
          </Anchor>
        </Link>
      </Text>

      <Paper withBorder p={30} mt={30} radius="md">
        <Alert color="blue" variant="light" mb="md">
          <Text fw={500} mb="xs">🚨 Test Credentials (Pre-filled):</Text>
          <Text size="sm">
            Email: <strong>test@example.com</strong><br/>
            Password: <strong>password</strong>
          </Text>
        </Alert>

        <form onSubmit={form.onSubmit(handleCredentialsSignIn)}>
          <TextInput
            label="Email"
            placeholder="you@mantine.dev"
            required
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
          <Button type="submit" fullWidth mt="xl">
            Sign in
          </Button>
        </form>

        <Group grow mb="md" mt="xl">
          <Button
            leftSection={<IconBrandGoogle size={18} />}
            variant="default"
            onClick={handleGoogleSignIn}
          >
            Sign in with Google
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}