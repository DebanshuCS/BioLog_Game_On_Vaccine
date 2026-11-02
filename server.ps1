# server.ps1 — Native Windows HTTP Server for ViroQuest
$Port = 8000
$ErrorActionPreference = 'SilentlyContinue'

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
try {
    $listener.Start()
} catch {
    $Port = 8080
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add('http://localhost:8080/')
    $listener.Start()
}

$url = 'http://localhost:' + $Port
Write-Host '==================================================='
Write-Host ('  ViroQuest Server Running: ' + $url)
Write-Host '  Press Ctrl+C to stop.'
Write-Host '==================================================='

Start-Process $url

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq '' -or $path -eq '/') {
            $path = '/index.html'
        }

        $relPath = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fullPath = Join-Path $root $relPath

        if (Test-Path -Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = 'application/octet-stream'
            if ($ext -eq '.html') { $mime = 'text/html; charset=utf-8' }
            elseif ($ext -eq '.css') { $mime = 'text/css; charset=utf-8' }
            elseif ($ext -eq '.js') { $mime = 'application/javascript; charset=utf-8' }
            elseif ($ext -eq '.json') { $mime = 'application/json; charset=utf-8' }
            elseif ($ext -eq '.svg') { $mime = 'image/svg+xml' }
            elseif ($ext -eq '.png') { $mime = 'image/png' }
            elseif ($ext -eq '.jpg') { $mime = 'image/jpeg' }
            elseif ($ext -eq '.ico') { $mime = 'image/x-icon' }

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $response.ContentLength64 = $err.Length
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.Close()
    } catch {
        # ignore transient client disconnects
    }
}
