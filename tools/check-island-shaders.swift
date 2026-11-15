// Compile/link Three-generated GLSL through macOS OpenGL, without a browser/window.
// Only the GLSL version is adapted; this does not prove WebGL pixels or performance.
import Foundation
import OpenGL.GL3
struct ShaderSource: Decodable { let type: UInt32; let source: String }
struct Program: Decodable { let name: String; let shaders: [ShaderSource] }
var pixelFormat: CGLPixelFormatObj?
var context: CGLContextObj?
var count: GLint = 0
let attributes = [kCGLPFAOpenGLProfile, CGLPixelFormatAttribute(kCGLOGLPVersion_3_2_Core.rawValue), CGLPixelFormatAttribute(0)]
let choice = CGLChoosePixelFormat(attributes, &pixelFormat, &count)
guard choice == kCGLNoError, let format=pixelFormat else { fatalError("Cannot choose OpenGL format") }
guard CGLCreateContext(format,nil,&context) == kCGLNoError, let active=context else { fatalError("Cannot create OpenGL context") }
CGLSetCurrentContext(active)
defer { CGLSetCurrentContext(nil); CGLDestroyContext(active); CGLDestroyPixelFormat(format) }
let programs=try JSONDecoder().decode([Program].self,from:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1])))
for program in programs {
    let handle=glCreateProgram()
    var shaders:[GLuint]=[]
    for shader in program.shaders {
        let id=glCreateShader(shader.type);shaders.append(id)
        let source=shader.source.replacingOccurrences(of:"#version 300 es",with:"#version 410 core")
        source.withCString { pointer in
            var p:UnsafePointer<GLchar>?=pointer
            glShaderSource(id,1,&p,nil)
        }
        glCompileShader(id)
        var status:GLint=0;glGetShaderiv(id,GLenum(GL_COMPILE_STATUS),&status)
        if status == 0 {
            var log=[GLchar](repeating:0,count:16384);glGetShaderInfoLog(id,16384,nil,&log)
            fputs(program.name+" compilation failed: "+String(cString:log)+"\n",stderr);exit(1)
        }
        glAttachShader(handle,id)
    }
    glLinkProgram(handle)
    var linked:GLint=0;glGetProgramiv(handle,GLenum(GL_LINK_STATUS),&linked)
    if linked == 0 {
        var log=[GLchar](repeating:0,count:16384);glGetProgramInfoLog(handle,16384,nil,&log)
        fputs(program.name+" linking failed: "+String(cString:log)+"\n",stderr);exit(1)
    }
    print("PASS: "+program.name+" compiled and linked (native OpenGL, not WebGL)")
    shaders.forEach{glDeleteShader($0)};glDeleteProgram(handle)
}
