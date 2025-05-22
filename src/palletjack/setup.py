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
        "agrc-supervisor==3.*",
        "ugrc-palletjack==5.*",
    ],
    extras_require={
        "tests": [
            "pandas==2.*",
            "pytest-instafail==0.5.*",
            "pytest==8.*",
            "ruff==0.*",
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
