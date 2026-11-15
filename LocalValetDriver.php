<?php

use Valet\Drivers\ValetDriver;

/** Serve the production build through Herd without a persistent Node server. */
class LocalValetDriver extends ValetDriver
{
    public function serves(string $sitePath, string $siteName, string $uri): bool
    {
        return is_file($sitePath.'/tools/herd/index.php');
    }

    public function isStaticFile(string $sitePath, string $siteName, string $uri)
    {
        // HTML requests must check source freshness before serving the entry page.
        if ($uri === '/' || $uri === '/index.html') {
            return false;
        }
        $dist = realpath($sitePath.'/dist');
        $file = realpath($sitePath.'/dist/'.ltrim($uri, '/'));
        return $dist && $file && str_starts_with($file, $dist.DIRECTORY_SEPARATOR)
            && is_file($file) ? $file : false;
    }

    public function serveStaticFile(string $staticFilePath, string $sitePath, string $siteName, string $uri): void
    {
        // Models keep stable filenames; local edits must not reuse a stale browser copy.
        header('Cache-Control: no-store');
        parent::serveStaticFile($staticFilePath, $sitePath, $siteName, $uri);
    }

    public function frontControllerPath(string $sitePath, string $siteName, string $uri): ?string
    {
        return $uri === '/' || $uri === '/index.html' ? $sitePath.'/tools/herd/index.php' : null;
    }
}
