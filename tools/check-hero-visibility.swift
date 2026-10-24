// Offscreen native depth-pass test. This verifies pixels, not browser WebGL.
import Foundation
import AppKit
import OpenGL.GL3
var format:CGLPixelFormatObj?,context:CGLContextObj?,count:GLint=0
let attributes=[kCGLPFAOpenGLProfile,CGLPixelFormatAttribute(kCGLOGLPVersion_3_2_Core.rawValue),CGLPixelFormatAttribute(0)]
guard CGLChoosePixelFormat(attributes,&format,&count)==kCGLNoError,let f=format else{fatalError("format")}
guard CGLCreateContext(f,nil,&context)==kCGLNoError,let c=context else{fatalError("context")}
CGLSetCurrentContext(c)
defer{CGLSetCurrentContext(nil);CGLDestroyContext(c);CGLDestroyPixelFormat(f)}
let program=glCreateProgram()
for (kind,source) in [(GLenum(GL_VERTEX_SHADER),"#version 150\nin vec3 position; void main(){gl_Position=vec4(position,1.0);}"),(GLenum(GL_FRAGMENT_SHADER),"#version 150\nuniform vec3 tint; out vec4 color; void main(){color=vec4(tint,1.0);}")]{
 let shader=glCreateShader(kind);source.withCString{p in var ptr:UnsafePointer<GLchar>?=p;glShaderSource(shader,1,&ptr,nil)};glCompileShader(shader)
 var ok:GLint=0;glGetShaderiv(shader,GLenum(GL_COMPILE_STATUS),&ok);precondition(ok==1);glAttachShader(program,shader)
}
glBindAttribLocation(program,0,"position");glLinkProgram(program);glUseProgram(program)
var vao:GLuint=0,vbo:GLuint=0,frame:GLuint=0,color:GLuint=0,depth:GLuint=0
glGenVertexArrays(1,&vao);glBindVertexArray(vao);glGenBuffers(1,&vbo);glBindBuffer(GLenum(GL_ARRAY_BUFFER),vbo)
glEnableVertexAttribArray(0);glVertexAttribPointer(0,3,GLenum(GL_FLOAT),GLboolean(GL_FALSE),0,nil)
glGenFramebuffers(1,&frame);glBindFramebuffer(GLenum(GL_FRAMEBUFFER),frame)
glGenRenderbuffers(1,&color);glBindRenderbuffer(GLenum(GL_RENDERBUFFER),color);glRenderbufferStorage(GLenum(GL_RENDERBUFFER),GLenum(GL_RGBA8),288,96)
glFramebufferRenderbuffer(GLenum(GL_FRAMEBUFFER),GLenum(GL_COLOR_ATTACHMENT0),GLenum(GL_RENDERBUFFER),color)
glGenRenderbuffers(1,&depth);glBindRenderbuffer(GLenum(GL_RENDERBUFFER),depth);glRenderbufferStorage(GLenum(GL_RENDERBUFFER),GLenum(GL_DEPTH_COMPONENT24),288,96)
glFramebufferRenderbuffer(GLenum(GL_FRAMEBUFFER),GLenum(GL_DEPTH_ATTACHMENT),GLenum(GL_RENDERBUFFER),depth)
precondition(glCheckFramebufferStatus(GLenum(GL_FRAMEBUFFER))==GLenum(GL_FRAMEBUFFER_COMPLETE))
glEnable(GLenum(GL_DEPTH_TEST));glDisable(GLenum(GL_BLEND));glClearColor(0.16,0.16,0.16,1);glClear(GLbitfield(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT))
func quad(_ left:Float,_ right:Float,_ z:Float,_ rgb:(Float,Float,Float)){
 let points:[Float]=[left,-0.7,z,right,-0.7,z,left,0.7,z,left,0.7,z,right,-0.7,z,right,0.7,z]
 glBufferData(GLenum(GL_ARRAY_BUFFER),points.count*MemoryLayout<Float>.size,points,GLenum(GL_STREAM_DRAW));glUniform3f(glGetUniformLocation(program,"tint"),rgb.0,rgb.1,rgb.2);glDrawArrays(GLenum(GL_TRIANGLES),0,6)
}
for i in 0..<3{
 glViewport(GLint(i*96),0,96,96);glDepthMask(GLboolean(GL_TRUE));glDepthFunc(GLenum(GL_LEQUAL))
 if i>0{quad(-0.9,i==1 ? 0:0.9,0,(0.35,0.32,0.27))}
 glDepthMask(GLboolean(GL_FALSE));glDepthFunc(GLenum(GL_GREATER));quad(-0.6,0.6,0.6,(150/255,201/255,189/255))
 glDepthMask(GLboolean(GL_TRUE));glDepthFunc(GLenum(GL_LEQUAL));quad(-0.6,0.6,0.6,(32/255,80/255,120/255))
}
var pixels=[UInt8](repeating:0,count:288*96*4);glReadPixels(0,0,288,96,GLenum(GL_RGBA),GLenum(GL_UNSIGNED_BYTE),&pixels)
func pixel(_ x:Int)->[UInt8]{Array(pixels[(48*288+x)*4..<(48*288+x)*4+3])}
precondition(pixel(32)==[32,80,120] && pixel(64)==[32,80,120],"Visible hero must not have a highlight")
precondition(pixel(128)==[150,201,189] && pixel(160)==[32,80,120],"Only hidden pixels must have a silhouette")
precondition(pixel(224)==[150,201,189] && pixel(256)==[150,201,189],"Fully hidden hero must remain readable")
let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:288,pixelsHigh:96,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:288*4,bitsPerPixel:32)!
pixels.withUnsafeBytes{bitmap.bitmapData!.update(from:$0.bindMemory(to:UInt8.self).baseAddress!,count:pixels.count)}
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
print("PASS: visible, partly occluded and fully occluded hero pixels; native OpenGL depth passes, not browser WebGL")
