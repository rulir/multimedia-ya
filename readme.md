# MULTIMEDIA-YA

Cмотреть в Google Chrome. В других браузера были замечены те или иные косяки.

Grayscale сделан при помощи наложения с типом "color".
Сначала делал обработку попиксельно, высчитывал значение и присваивал каждому пикселу. В чатике подсказали идею с наложением типа  'color' и такой способ конечно же более производительный. Хотя, при работе с конкретными пикселами пространство для действий гораздо шире.

Эффект старого кино достигнут при помощи наложения изображения полученного из видео с эфектом старой пленки. Наблюдая за частотой кадров пришел к выводу, что способ не сильно влияет на производительность и удобнее в реализации чем генерация эффектов вручную, хотя это производительнее.