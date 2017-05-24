---
bg: "rails.jpg"
layout: default
crawlertitle: "diary"
permalink: /diary/
title: "DIARY"
summary: "my tech diary"
type: diary
---

{% for article in site.posts %}
<h1>{{ article.title}}</h1>
    {% if article.categories == "diary" %}
        <article class="index-page">
          <h2><a href="{{ article.url }}">{{ article.title }}</a></h2>
          {{ article.excerpt }}
        </article>
    {% endif %}
{% endfor %}
