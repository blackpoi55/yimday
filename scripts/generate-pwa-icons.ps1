$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$outputDir = Join-Path $PSScriptRoot "..\\public\\pwa"
$appDir = Join-Path $PSScriptRoot "..\\src\\app"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

function New-RoundedRectPath {
  param(
    [System.Drawing.RectangleF]$Rect,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function New-Brush {
  param(
    [System.Drawing.RectangleF]$Rect,
    [System.Drawing.Color]$StartColor,
    [System.Drawing.Color]$EndColor,
    [float]$Angle
  )

  return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $Rect,
    $StartColor,
    $EndColor,
    $Angle
  )
}

function Draw-YimdayIcon {
  param(
    [int]$Size,
    [string]$Path,
    [switch]$Maskable
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $canvas = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
  $graphics.Clear([System.Drawing.Color]::FromArgb(20, 33, 84))

  $backgroundBrush = New-Brush `
    -Rect $canvas `
    -StartColor ([System.Drawing.Color]::FromArgb(20, 33, 84)) `
    -EndColor ([System.Drawing.Color]::FromArgb(16, 185, 129)) `
    -Angle 135
  $graphics.FillRectangle($backgroundBrush, $canvas)

  $blobBrushTop = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(50, 255, 255, 255)
  )
  $graphics.FillEllipse(
    $blobBrushTop,
    [float]($Size * -0.08),
    [float]($Size * -0.06),
    [float]($Size * 0.72),
    [float]($Size * 0.48)
  )

  $blobBrushBottom = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(40, 59, 130, 246)
  )
  $graphics.FillEllipse(
    $blobBrushBottom,
    [float]($Size * 0.46),
    [float]($Size * 0.54),
    [float]($Size * 0.54),
    [float]($Size * 0.42)
  )

  $facePadding = if ($Maskable) { 0.16 } else { 0.2 }
  $faceSize = [float]($Size * (1 - ($facePadding * 2)))
  $faceX = [float](($Size - $faceSize) / 2)
  $faceY = [float]($Size * 0.18)
  $faceRect = New-Object System.Drawing.RectangleF $faceX, $faceY, $faceSize, $faceSize

  $shadowBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(46, 15, 23, 42)
  )
  $graphics.FillEllipse(
    $shadowBrush,
    [float]($faceRect.X + ($Size * 0.018)),
    [float]($faceRect.Y + ($Size * 0.04)),
    $faceRect.Width,
    $faceRect.Height
  )

  $faceBrush = New-Brush `
    -Rect $faceRect `
    -StartColor ([System.Drawing.Color]::FromArgb(255, 226, 92)) `
    -EndColor ([System.Drawing.Color]::FromArgb(255, 141, 59)) `
    -Angle 135
  $graphics.FillEllipse($faceBrush, $faceRect)

  $highlightBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(60, 255, 255, 255)
  )
  $graphics.FillEllipse(
    $highlightBrush,
    [float]($faceRect.X + ($faceRect.Width * 0.12)),
    [float]($faceRect.Y + ($faceRect.Height * 0.08)),
    [float]($faceRect.Width * 0.32),
    [float]($faceRect.Height * 0.18)
  )

  $eyeBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(25, 36, 84)
  )
  $eyeWidth = [float]($Size * 0.07)
  $eyeHeight = [float]($Size * 0.12)
  $eyeY = [float]($faceRect.Y + ($faceRect.Height * 0.34))
  $leftEyeX = [float]($faceRect.X + ($faceRect.Width * 0.27))
  $rightEyeX = [float]($faceRect.X + ($faceRect.Width * 0.66) - $eyeWidth)
  $graphics.FillEllipse($eyeBrush, $leftEyeX, $eyeY, $eyeWidth, $eyeHeight)
  $graphics.FillEllipse($eyeBrush, $rightEyeX, $eyeY, $eyeWidth, $eyeHeight)

  $smilePen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(25, 36, 84),
    [float]($Size * 0.048)
  )
  $smilePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $smilePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $smileRect = New-Object System.Drawing.RectangleF(
    [float]($faceRect.X + ($faceRect.Width * 0.2)),
    [float]($faceRect.Y + ($faceRect.Height * 0.36)),
    [float]($faceRect.Width * 0.6),
    [float]($faceRect.Height * 0.42)
  )
  $graphics.DrawArc($smilePen, $smileRect, 18, 144)

  $cheekBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(55, 255, 255, 255)
  )
  $cheekSize = [float]($Size * 0.08)
  $graphics.FillEllipse(
    $cheekBrush,
    [float]($faceRect.X + ($faceRect.Width * 0.2)),
    [float]($faceRect.Y + ($faceRect.Height * 0.58)),
    $cheekSize,
    [float]($cheekSize * 0.72)
  )
  $graphics.FillEllipse(
    $cheekBrush,
    [float]($faceRect.Right - ($faceRect.Width * 0.2) - $cheekSize),
    [float]($faceRect.Y + ($faceRect.Height * 0.58)),
    $cheekSize,
    [float]($cheekSize * 0.72)
  )

  $sparklePen = New-Object System.Drawing.Pen(
    [System.Drawing.Color]::FromArgb(245, 255, 255, 255),
    [float]($Size * 0.022)
  )
  $sparklePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $sparklePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $sparkleCenterX = [float]($faceRect.Right - ($faceRect.Width * 0.12))
  $sparkleCenterY = [float]($faceRect.Y + ($faceRect.Height * 0.12))
  $sparkleRadius = [float]($Size * 0.05)
  $graphics.DrawLine(
    $sparklePen,
    $sparkleCenterX,
    [float]($sparkleCenterY - $sparkleRadius),
    $sparkleCenterX,
    [float]($sparkleCenterY + $sparkleRadius)
  )
  $graphics.DrawLine(
    $sparklePen,
    [float]($sparkleCenterX - $sparkleRadius),
    $sparkleCenterY,
    [float]($sparkleCenterX + $sparkleRadius),
    $sparkleCenterY
  )

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $sparklePen.Dispose()
  $cheekBrush.Dispose()
  $smilePen.Dispose()
  $eyeBrush.Dispose()
  $highlightBrush.Dispose()
  $faceBrush.Dispose()
  $shadowBrush.Dispose()
  $blobBrushBottom.Dispose()
  $blobBrushTop.Dispose()
  $backgroundBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Convert-PngToIco {
  param(
    [string]$PngPath,
    [string]$IcoPath
  )

  $pngBytes = [System.IO.File]::ReadAllBytes($PngPath)
  $stream = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter($stream)

  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)
  $writer.Write([Byte]32)
  $writer.Write([Byte]32)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)
  $writer.Flush()

  [System.IO.File]::WriteAllBytes($IcoPath, $stream.ToArray())

  $writer.Dispose()
  $stream.Dispose()
}

Draw-YimdayIcon -Size 192 -Path (Join-Path $outputDir "icon-192.png")
Draw-YimdayIcon -Size 512 -Path (Join-Path $outputDir "icon-512.png")
Draw-YimdayIcon -Size 512 -Path (Join-Path $outputDir "maskable-512.png") -Maskable
Draw-YimdayIcon -Size 180 -Path (Join-Path $outputDir "apple-touch-icon.png")
Draw-YimdayIcon -Size 32 -Path (Join-Path $appDir "icon.png")
Convert-PngToIco -PngPath (Join-Path $appDir "icon.png") -IcoPath (Join-Path $appDir "favicon.ico")
