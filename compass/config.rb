# base path definitions
path_base    = File.absolute_path(File.join(File.dirname(__FILE__), ".."))

#
# Compass overridden configuration properties
# Full configuration documentation:
# @see http://compass-style.org/help/tutorials/configuration-reference/
#

project_type = :stand_alone
project_path = path_base
http_path = "/"

sass_dir = "compass/scss"
sass_path = File.join(path_base, sass_dir)

css_dir = "public/css"
http_stylesheets_path = File.join(http_path, "css")

images_dir = "public/image"
http_images_path = File.join(http_path, "image")

generated_images_dir = File.join(images_dir, "generated")
http_generated_images_path = File.join(http_path, "image/generated")

javascripts_dir = "public/js"
http_javascripts_path = File.join(http_path, "js")

fonts_dir = "public/font"
http_fonts_path = File.join(http_path, "font")

#
# Custom debugging
#

puts  "-------------------------- ecosystem --------------------------"
printf(" environment: %s\n", environment ? environment : "-- not set --")
puts  "--------------------- system paths & such ---------------------"
printf("*              compass base: %s\n", Compass.base_directory)
printf("               project_type: %s\n", project_type)
printf("               project_path: %s\n", project_path)
printf("                  http_path: %s\n", http_path)
printf("                   sass_dir: %s\n", sass_dir)
printf("                  sass_path: %s\n", sass_path)
printf("                    css_dir: %s\n", css_dir)
printf("      http_stylesheets_path: %s\n", http_stylesheets_path)
printf("                 images_dir: %s\n", images_dir)
printf("           http_images_path: %s\n", http_images_path)
printf("       generated_images_dir: %s\n", generated_images_dir)
printf(" http_generated_images_path: %s\n", http_generated_images_path)
printf("            javascripts_dir: %s\n", javascripts_dir)
printf("      http_javascripts_path: %s\n", http_javascripts_path)
printf("                  fonts_dir: %s\n", fonts_dir)
printf("            http_fonts_path: %s\n", http_fonts_path)
puts

# To enable relative paths to assets via compass helper functions. Uncomment:
# relative_assets = true

line_comments = true
output_style = :nested # :expanded or :nested or :compact or :compressed
sass_options = { :debug_info => true }

if environment == :production
    line_comments = false
    output_style = :compressed
    sass_options = { :debug_info => false }
end

#
# More debugging
#
puts "--------------------- compiling overrides ---------------------"
printf("            output_style: %s\n", output_style)
printf("            sass_options: %s\n", sass_options)
printf("           sprite_engine: %s\n", sprite_engine ? sprite_engine : "-- default --")
printf("        preferred_syntax: %s\n", preferred_syntax ? preferred_syntax : "-- default --")
printf("        disable_warnings: %s\n", disable_warnings ? "Yes" : "No")
printf(" additional_import_paths: %s\n", additional_import_paths ? additional_import_paths : '-- none --')
printf("         relative_assets: %s\n", relative_assets ? "Yes" : "No")
printf("           line_comments: %s\n", line_comments ? "Yes" : "No")
puts

# setup framework discovery
Compass::Frameworks.discover(:defaults)

# load compass frameworks
Compass::Frameworks.register_directory(File.join(Compass.base_directory, 'frameworks/compass'))
Compass::Frameworks.register_directory(File.join(Compass.base_directory, 'frameworks/blueprint'))
