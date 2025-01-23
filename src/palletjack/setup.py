#!/usr/bin/env python
# -*- encoding: utf-8 -*-
"""
setup.py
A module that installs the backup process as a module
"""

from setuptools import find_packages, setup

setup(
    name="palletjack",
    version="1.0.0",
    license="MIT",
    description="Roadkill skid",
    author="UGRC Developers",
    author_email="ugrc-developers@utah.gov",
    url="https://github.com/agrc/roadkill-mobile",
    packages=find_packages("src"),
    package_dir={"": "src"},
    include_package_data=True,
    zip_safe=True,
    classifiers=[
        # complete classifier list: http://pypi.python.org/pypi?%3Aaction=list_classifiers
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Utilities",
    ],
    keywords=["gis"],
    install_requires=[
        "ugrc-palletjack==5.*",
        "requests<2.33",
        "agrc-supervisor==3.0.*",
    ],
    extras_require={
        "tests": [
            "pylint-quotes~=0.2",
            "pylint~=2.11",
            "pytest-instafail~=0.4",
            "pytest-isort>=2,<5",
            "pytest-pylint~=0.18",
            "pytest~=6.0",
            "black~=22.12",
            "pandas==2.*",
        ]
    },
    setup_requires=[
        "pytest-runner",
    ],
    entry_points={
        "console_scripts": [
            "process = roadkill.main:process",
        ]
    },
)
