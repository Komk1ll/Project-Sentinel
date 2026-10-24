<?php

/** Synchronous build-on-request; no watcher, proxy or launch agent is used. */
$project = dirname(__DIR__, 2);
$cache = $project.'/.herd-local';
if (!is_dir($cache)) {
    mkdir($cache, 0700, true);
}
$lock = fopen($cache.'/build.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    http_response_code(503);
    exit('Cannot acquire the local build lock.');
}

try {
    $files = [];
    foreach (['src', 'public'] as $directory) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(
            $project.'/'.$directory, FilesystemIterator::SKIP_DOTS
        ));
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $files[] = $file->getPathname();
            }
        }
    }
    foreach (['index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json'] as $name) {
        $files[] = $project.'/'.$name;
    }
    sort($files);
    $hash = hash_init('sha256');
    foreach ($files as $file) {
        if (is_file($file)) {
            hash_update($hash, substr($file, strlen($project))."\0".hash_file('sha256', $file));
        }
    }
    $fingerprint = hash_final($hash);
    $state = is_file($cache.'/state.json') ? json_decode(file_get_contents($cache.'/state.json'), true) : null;
    $entry = $project.'/dist/index.html';
    $fresh = is_file($entry) && ($state['fingerprint'] ?? null) === $fingerprint
        && ($state['entryHash'] ?? null) === hash_file('sha256', $entry);
    if (!$fresh) {
        $node = null;
        foreach (['/usr/local/bin/node', '/opt/homebrew/bin/node'] as $candidate) {
            if (is_executable($candidate)) {
                $node = $candidate;
                break;
            }
        }
        if (!$node || !is_file($project.'/node_modules/vite/bin/vite.js')) {
            throw new RuntimeException('Node or dependencies missing. Run npm install in the project.');
        }
        file_put_contents($cache.'/build.log', 'Build started '.gmdate('c')."\n");
        foreach ([['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build']] as $command) {
            $process = proc_open(
                [$node, $project.'/'.$command[0], $command[1]],
                [0 => ['file', '/dev/null', 'r'], 1 => ['file', $cache.'/build.log', 'a'], 2 => ['file', $cache.'/build.log', 'a']],
                $pipes, $project
            );
            if (!is_resource($process) || proc_close($process) !== 0) {
                throw new RuntimeException('Local build failed. See .herd-local/build.log in the project.');
            }
        }
        file_put_contents($cache.'/state.json', json_encode([
            'fingerprint' => $fingerprint, 'entryHash' => hash_file('sha256', $entry),
            'builtAt' => gmdate('c'),
        ], JSON_PRETTY_PRINT));
        header('X-CyberShield-Build: rebuilt');
    } else {
        header('X-CyberShield-Build: current');
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    readfile($entry);
} catch (Throwable $error) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "CyberShield local build is unavailable.\n".$error->getMessage();
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
